/**
 * The service's HTTP side:
 *
 *   GET  /health               for Railway and the main API (no secrets in it)
 *   POST /twilio/inbound       texts riders send back (STOP, START, HELP)
 *   POST /twilio/status        delivery receipts for texts we sent
 *   POST /internal/broadcast   an admin's text to everyone on a route, forwarded by the main API
 *
 * Twilio's routes accept only requests carrying a valid Twilio signature; /internal/* only the
 * shared SMS_SERVICE_TOKEN.
 */
import crypto from 'node:crypto';
import express, { NextFunction, Request, Response } from 'express';
import twilio from 'twilio';
import { config } from '../config';
import { app as appDb, inChunks, sms } from '../db';
import { smsRevoked } from '../access';
import { sendSettings } from '../settings';
import { cancelTrips, startTrip } from '../jobs/oneTimeTrip';
import { timetable } from '../transit/timetable';
import { handleInbound } from '../jobs/inbound';
import { deliver, maskPhone } from '../delivery/outbox';
import { reginaDate } from '../time';
import { segments, toGsm } from '../alerts/gsm';
import { publicStatus } from '../workers';

const escapeXml = (s: string) => s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
const twiml = (res: Response, reply: string | null) => {
    res.set('Content-Type', 'text/xml');
    res.send(reply ? `<Response><Message>${escapeXml(reply)}</Message></Response>` : '<Response></Response>');
};

/** Refuses anything not signed by Twilio for this exact URL */
function twilioSigned(req: Request, res: Response, next: NextFunction): void {
    const { twilioToken, publicUrl } = config();
    const signature = String(req.headers['x-twilio-signature'] ?? '');
    const valid = !!twilioToken && !!publicUrl && twilio.validateRequest(twilioToken, signature, publicUrl + req.originalUrl, (req.body ?? {}) as Record<string, string>);
    if (!valid) {
        console.warn(`[HTTP] Refused unsigned ${req.originalUrl}${!twilioToken || !publicUrl ? ' (TWILIO_AUTH_TOKEN or SMS_PUBLIC_URL is not set)' : ''}`);
        res.status(403).send('Forbidden');
        return;
    }
    next();
}

function internalOnly(req: Request, res: Response, next: NextFunction): void {
    const expected = config().serviceToken;
    const given = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    const ok = !!expected && given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
    if (!ok) { res.status(401).json({ error: 'Not allowed' }); return; }
    next();
}

export function createApp() {
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 2);

    app.get('/health', async (_req, res) => {
        const c = config(), tt = timetable(), today = reginaDate();
        const s = await sendSettings().catch(() => null);
        res.json({
            ok: true, service: 'transitr-sms', enabled: c.enabled, dryRun: s?.dryRun ?? null, pilot: s ? s.allowlist.length > 0 : null,
            timetable: { start: tt.feed.start, end: tt.feed.end, coversToday: tt.covers(today) },
            workers: publicStatus(),
        });
    });

    const form = express.urlencoded({ extended: false, limit: '10kb' });

    app.post('/twilio/inbound', form, twilioSigned, async (req, res) => {
        const from = String(req.body?.From ?? ''), body = String(req.body?.Body ?? '');
        if (!from) { res.status(400).send('Missing From'); return; }
        try {
            const reply = await handleInbound(from, body);
            if (reply) {
                const text = toGsm(reply);
                // Twilio sends a TwiML reply itself; record it so the day's count and cost include it
                const { data: person } = await appDb().from('profiles').select('id').eq('mobile_number', from).limit(1).maybeSingle();
                await sms().from('messages').insert({ user_id: person?.id ?? null, kind: 'reply', to_phone: from, body: text, segments: segments(text), status: 'sent' });
                twiml(res, text);
            } else twiml(res, null);
        } catch (err) {
            console.error(`[HTTP] Inbound text from ${maskPhone(from)} failed:`, (err as Error).message);
            twiml(res, null);   // never make Twilio retry a reply into a loop
        }
    });

    app.post('/twilio/status', form, twilioSigned, async (req, res) => {
        const sid = String(req.body?.MessageSid ?? ''), status = String(req.body?.MessageStatus ?? '');
        if (sid && status) {
            const code = Number(req.body?.ErrorCode);
            await sms().from('messages').update({ status, ...(Number.isFinite(code) && code > 0 ? { error_code: code } : {}), updated_at: new Date().toISOString() }).eq('twilio_sid', sid);
        }
        res.sendStatus(204);
    });

    app.post('/internal/broadcast', express.json({ limit: '10kb' }), internalOnly, async (req, res) => {
        if (!config().enabled) { res.status(503).json({ error: 'SMS sending is turned off (SMS_ENABLED=false)' }); return; }
        const { routeNum, message } = (req.body ?? {}) as { routeNum?: unknown; message?: unknown };
        if (typeof routeNum !== 'string' || !/^[A-Za-z0-9]{1,6}$/.test(routeNum) || typeof message !== 'string' || !message.trim()) {
            res.status(400).json({ error: 'routeNum and message are required' }); return;
        }
        const text = toGsm(message);
        if (text.length > 160) { res.status(400).json({ error: 'Message must be 160 characters or fewer (single SMS segment)' }); return; }

        const { data: schedules, error } = await appDb().from('weekly_schedules').select('user_id').eq('route_num', routeNum).eq('enabled', true);
        if (error) { res.status(500).json({ error: 'Could not read schedules' }); return; }
        const userIds = [...new Set((schedules ?? []).map(s => s.user_id as string))];
        const profiles = await inChunks(userIds, async ids => (await appDb().from('profiles').select('id, mobile_number')
            .in('id', ids).eq('sms_opted_in', true).eq('mobile_verified', true).not('mobile_number', 'is', null)).data ?? []);
        const revoked = await smsRevoked(userIds).catch(() => null);
        if (!revoked) { res.status(500).json({ error: 'Could not read who may get texts' }); return; }
        const seen = new Set<string>();
        const recipients = profiles.filter(p => p.mobile_number && !revoked.has(p.id) && !seen.has(p.mobile_number) && seen.add(p.mobile_number));

        res.json({ ok: true, sent: recipients.length });
        // After answering: 100 ms between texts stays inside Twilio's per-number rate limit
        void (async () => {
            for (const p of recipients) {
                await deliver({ to: p.mobile_number as string, body: text, userId: p.id as string, alertId: null, kind: 'broadcast' })
                    .catch(err => console.error('[Broadcast] Send failed:', (err as Error).message));
                await new Promise(r => setTimeout(r, 100));
            }
            console.log(`[Broadcast] Route ${routeNum}: ${recipients.length} texts handed out`);
        })();
    });

    // One-time trip texts, started from the map. The main API has checked the rider may have them.
    app.post('/internal/trips', express.json({ limit: '10kb' }), internalOnly, async (req, res) => {
        const b = (req.body ?? {}) as Record<string, unknown>;
        const point = (v: unknown) => { const p = v as { lat?: unknown; lng?: unknown } | null; return !!p && typeof p.lat === 'number' && typeof p.lng === 'number' && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180; };
        const id = /^[A-Za-z0-9]{1,10}$/;
        const legs = Array.isArray(b.legs) ? b.legs as Record<string, unknown>[] : [];
        if (typeof b.userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(b.userId) || !legs.length || legs.length > 3
            || !legs.every(l => typeof l.route === 'string' && id.test(l.route) && typeof l.boardStopId === 'string' && id.test(l.boardStopId) && typeof l.alightStopId === 'string' && id.test(l.alightStopId))
            || !point(b.origin) || !point(b.destination) || (b.destinationName != null && (typeof b.destinationName !== 'string' || b.destinationName.length > 120))) {
            res.status(400).json({ error: 'Invalid trip' }); return;
        }
        const r = await startTrip({
            userId: b.userId, legs: legs.map(l => ({ route: l.route as string, boardStopId: l.boardStopId as string, alightStopId: l.alightStopId as string })),
            origin: b.origin as { lat: number; lng: number }, destination: b.destination as { lat: number; lng: number },
            destinationName: (b.destinationName as string | null | undefined)?.trim() || null,
        });
        if (!r.ok) { res.status(r.status).json({ error: r.error }); return; }
        res.json(r);
    });

    app.post('/internal/trips/cancel', express.json({ limit: '1kb' }), internalOnly, async (req, res) => {
        const userId = (req.body ?? {}).userId;
        if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) { res.status(400).json({ error: 'Invalid user' }); return; }
        res.json({ ok: true, cancelled: await cancelTrips(userId, reginaDate()) });
    });

    app.use((_req, res) => { res.status(404).json({ error: 'Not found' }); });
    app.use((err: Error & { status?: number }, req: Request, res: Response, _next: NextFunction) => {
        if (err.status && err.status < 500) { res.status(err.status).json({ error: 'Bad request' }); return; }
        console.error('[HTTP] Error on', req.method, req.originalUrl, err);
        res.status(500).json({ error: 'Something went wrong' });
    });
    return app;
}
