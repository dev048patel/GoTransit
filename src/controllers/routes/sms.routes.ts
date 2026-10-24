import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import express from 'express';
import { serviceDb, userDb } from '../../models/lib/serverDb';
import { SecurityEventService } from '../../models/services/SecurityEventService';
import { clientIp, rateLimit } from '../middleware/security';
import { requireAuth } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';
import { TwilioService } from '../../models/services/TwilioService';
import { smsRevokedIds } from '../../models/services/SmsAccessService';
import { PhoneVerificationService, VerifyError, CheckResult } from '../../models/services/PhoneVerificationService';

const router = Router();

// E.164 Canadian number: +1 followed by exactly 10 digits
const CANADIAN_E164 = /^\+1\d{10}$/;

function isValidPhone(phone: string): boolean {
    // Accept "+1XXXXXXXXXX" or "+1 XXX-XXX-XXXX" — normalise then test
    const stripped = phone.replace(/[\s\-().]/g, '');
    return CANADIAN_E164.test(stripped);
}

function normalisePhone(phone: string): string {
    return phone.replace(/[\s\-().]/g, '');
}

// ── POST /api/sms/opt-in ────────────────────────────────────────────────────
// Marks the authenticated user as opted in to SMS departure reminders.
// userId always comes from the verified JWT — never from the body.
router.post('/opt-in', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;

    // Fetch current phone on file — opt-in is meaningless without one
    const { data: profile, error: fetchErr } = await userDb(req.user!.token)
        .from('profiles')
        .select('mobile_number, mobile_verified')
        .eq('id', userId)
        .single();

    if (fetchErr) { res.status(500).json({ error: 'Failed to fetch profile' }); return; }
    if (!profile?.mobile_number) {
        res.status(400).json({ error: 'Add a phone number to your profile before enabling SMS reminders' });
        return;
    }
    if (!profile.mobile_verified) {
        res.status(400).json({ error: 'Verify your phone number before turning on text alerts' });
        return;
    }
    // An admin can switch text alerts off for one person
    const revoked = await smsRevokedIds([userId]).catch(() => null);
    if (!revoked) { res.status(500).json({ error: 'Could not save the change' }); return; }
    if (revoked.has(userId)) {
        res.status(403).json({ error: 'Text alerts are not available on your account. Contact us if you think this is a mistake.' });
        return;
    }

    const { error } = await userDb(req.user!.token)
        .from('profiles')
        .update({ sms_opted_in: true, sms_consent_at: new Date().toISOString() })
        .eq('id', userId);

    if (error) { res.status(500).json({ error: 'Could not save the change' }); return; }
    res.json({ ok: true });
});

// ── POST /api/sms/opt-out ───────────────────────────────────────────────────
router.post('/opt-out', requireAuth, async (req: Request, res: Response) => {
    const { error } = await userDb(req.user!.token)
        .from('profiles')
        .update({ sms_opted_in: false })
        .eq('id', req.user!.id);

    if (error) { res.status(500).json({ error: 'Could not save the change' }); return; }
    res.json({ ok: true });
});

// ── PATCH /api/sms/phone ────────────────────────────────────────────────────
// Updates the authenticated user's mobile number.
// Opts them out automatically — they must verify the new number and re-consent after a number change.
router.patch('/phone', requireAuth, async (req: Request, res: Response) => {
    const { phone } = req.body as { phone?: string };
    if (!phone) { res.status(400).json({ error: 'phone is required' }); return; }
    if (!isValidPhone(phone)) {
        res.status(400).json({ error: 'Enter a valid Canadian number (+1 XXX-XXX-XXXX)' });
        return;
    }

    const { error } = await userDb(req.user!.token)
        .from('profiles')
        .update({ mobile_number: normalisePhone(phone), mobile_verified: false, sms_opted_in: false })
        .eq('id', req.user!.id);

    if (error) { res.status(500).json({ error: 'Could not save the change' }); return; }
    res.json({ ok: true });
});

/** The number on the rider's profile, in the +1XXXXXXXXXX form Twilio uses */
async function savedPhone(req: Request, res: Response): Promise<{ saved: string; phone: string; verified: boolean } | null> {
    if (!PhoneVerificationService.configured()) { res.status(503).json({ error: 'Phone verification is not set up yet. Try again later.' }); return null; }
    const { data: profile, error } = await userDb(req.user!.token).from('profiles').select('mobile_number, mobile_verified').eq('id', req.user!.id).single();
    if (error) { res.status(500).json({ error: 'Failed to fetch profile' }); return null; }
    if (!profile?.mobile_number) { res.status(400).json({ error: 'Add a phone number to your profile first' }); return null; }
    if (!isValidPhone(profile.mobile_number)) { res.status(400).json({ error: 'Enter a valid Canadian number (+1 XXX-XXX-XXXX) in your profile first' }); return null; }
    return { saved: profile.mobile_number, phone: normalisePhone(profile.mobile_number), verified: !!profile.mobile_verified };
}

// ── POST /api/sms/verify/send ───────────────────────────────────────────────
// Texts a one-time code to the number on the rider's profile. Twilio Verify also limits codes per number.
router.post('/verify/send', requireAuth, rateLimit('sms-verify-send', 5), async (req: Request, res: Response) => {
    const p = await savedPhone(req, res);
    if (!p) return;
    if (p.verified) { res.status(400).json({ error: 'This number is already verified' }); return; }
    try { await PhoneVerificationService.send(p.phone); }
    catch (err) { const e = err instanceof VerifyError ? err : new VerifyError('The code could not be sent. Try again in a few minutes.', 503); res.status(e.status).json({ error: e.message }); return; }
    res.json({ ok: true });
});

// ── POST /api/sms/verify/check { code } ─────────────────────────────────────
// Marks the number verified only when Twilio approves the code. Anything else leaves mobile_verified false.
router.post('/verify/check', requireAuth, rateLimit('sms-verify-check', 10), async (req: Request, res: Response) => {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!/^\d{4,10}$/.test(code)) { res.status(400).json({ error: 'Enter the code from the text message' }); return; }
    const p = await savedPhone(req, res);
    if (!p) return;
    if (p.verified) { res.json({ ok: true, phone: p.phone }); return; }

    let result: CheckResult;
    try { result = await PhoneVerificationService.check(p.phone, code); }
    catch (err) { const e = err instanceof VerifyError ? err : new VerifyError('The code could not be checked. Try again in a few minutes.', 503); res.status(e.status).json({ error: e.message }); return; }
    if (result === 'wrong') { res.status(400).json({ error: 'That code is not right. Check the text and try again.' }); return; }
    if (result === 'expired') { res.status(400).json({ error: 'That code has expired. Send a new code.' }); return; }

    // Only the backend can set mobile_verified. The number must still be the one the code was sent to.
    const { data, error } = await serviceDb().from('profiles')
        .update({ mobile_number: p.phone, mobile_verified: true, updated_at: new Date().toISOString() })
        .eq('id', req.user!.id).eq('mobile_number', p.saved).select('id');
    if (error) { console.error('[SMS] Could not mark number verified:', error.message); res.status(500).json({ error: 'Could not save the change' }); return; }
    if (!data?.length) { res.status(409).json({ error: 'Your number changed while you were verifying it. Send a new code.' }); return; }
    res.json({ ok: true, phone: p.phone });
});

// ── POST /api/sms/webhook ───────────────────────────────────────────────────
// Twilio calls this when a user texts back (STOP / START / HELP).
// Legacy: the SMS service's /twilio/inbound replaces it. Delete this
// route once the Twilio console points there.
// Validated using Twilio's request signature so only Twilio can POST here.
// Twilio posts form-encoded data, so this route parses that (the app only parses JSON by default).
router.post('/webhook', rateLimit('sms-webhook', 120), express.urlencoded({ extended: false, limit: '10kb' }), async (req: Request, res: Response) => {
    const authToken  = process.env.TWILIO_AUTH_TOKEN ?? '';
    const backendUrl = process.env.BACKEND_URL ?? '';

    // Always require a valid Twilio signature. Without the settings needed to check one, refuse:
    // an unchecked webhook would let anyone opt any phone number in or out.
    const signature = (req.headers['x-twilio-signature'] as string) ?? '';
    const valid = !!authToken && !!backendUrl
        && twilio.validateRequest(authToken, signature, `${backendUrl}/api/sms/webhook`, (req.body ?? {}) as Record<string, string>);
    if (!valid) {
        void SecurityEventService.record({ type: 'webhook_rejected', severity: 'warning', throttle: true, ip: clientIp(req), path: req.originalUrl,
            message: authToken && backendUrl ? 'Text-message webhook called without a valid Twilio signature' : 'Text-message webhook refused: TWILIO_AUTH_TOKEN or BACKEND_URL is not set' });
        res.status(403).send('Forbidden');
        return;
    }

    const body: string = (req.body?.Body ?? '').trim().toUpperCase();
    const from: string = req.body?.From ?? '';

    if (!from) { res.status(400).send('Missing From'); return; }

    // Mirror Twilio's suppression list into our DB so the cron stays in sync
    if (body === 'STOP' || body === 'STOPALL' || body === 'UNSUBSCRIBE' || body === 'CANCEL' || body === 'END' || body === 'QUIT') {
        await serviceDb()
            .from('profiles')
            .update({ sms_opted_in: false })
            .eq('mobile_number', from);
    } else if (body === 'START' || body === 'UNSTOP' || body === 'YES') {
        await serviceDb()
            .from('profiles')
            .update({ sms_opted_in: true, sms_consent_at: new Date().toISOString() })
            .eq('mobile_number', from);
    }

    // Return empty TwiML — Twilio expects XML, not JSON
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
});

// ── POST /api/sms/broadcast ─────────────────────────────────────────────────
// Admin-only. Sends a custom SMS to all opted-in users on a given route.
// Once SMS_SERVICE_URL is set, the SMS service (services/sms) sends it; until then, this API does.
router.post('/broadcast', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    const { routeNum, message } = (req.body ?? {}) as { routeNum?: string; message?: string };
    if (typeof routeNum !== 'string' || typeof message !== 'string' || !/^[A-Za-z0-9]{1,6}$/.test(routeNum) || !message.trim()) {
        res.status(400).json({ error: 'routeNum and message are required' });
        return;
    }
    if (message.length > 160) {
        res.status(400).json({ error: 'Message must be 160 characters or fewer (single SMS segment)' });
        return;
    }

    const smsService = process.env.SMS_SERVICE_URL, smsToken = process.env.SMS_SERVICE_TOKEN;
    if (smsService && smsToken) {
        let r: globalThis.Response;
        try {
            r = await fetch(`${smsService.replace(/\/+$/, '')}/internal/broadcast`, {
                method: 'POST', headers: { Authorization: `Bearer ${smsToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ routeNum, message }), signal: AbortSignal.timeout(3_000),
            });
        } catch {
            res.status(503).json({ error: 'The SMS service is not answering. Try again in a few minutes.' });
            return;
        }
        const body = await r.json().catch(() => ({})) as { sent?: number; error?: string };
        if (r.ok) void SecurityEventService.record({ type: 'sms_broadcast', severity: 'warning', ip: clientIp(req), userId: req.user!.id, path: req.originalUrl,
            message: `Admin sent a text broadcast for route ${routeNum} to ${body.sent ?? 0} people` });
        res.status(r.ok ? 200 : r.status >= 500 ? 503 : r.status).json(r.ok ? { ok: true, sent: body.sent ?? 0 } : { error: body.error ?? 'The SMS service refused the broadcast' });
        return;
    }

    if (!TwilioService.isConfigured()) {
        res.status(503).json({ error: 'Twilio is not configured on this server' });
        return;
    }

    // Find users who have this route in their weekly schedule and are opted in
    const { data: schedules } = await serviceDb()
        .from('weekly_schedules')
        .select('user_id')
        .eq('route_num', routeNum)
        .eq('enabled', true);

    if (!schedules?.length) {
        res.json({ ok: true, sent: 0 });
        return;
    }

    const userIds = [...new Set(schedules.map(s => s.user_id))];
    const revoked = await smsRevokedIds(userIds).catch(() => null);
    if (!revoked) { res.status(500).json({ error: 'Could not read who may get texts' }); return; }

    const { data: profiles } = await serviceDb()
        .from('profiles')
        .select('id, mobile_number')
        .in('id', userIds)
        .eq('sms_opted_in', true)
        .eq('mobile_verified', true)
        .not('mobile_number', 'is', null);

    const recipients = (profiles ?? [])
        .filter(p => p.mobile_number && !revoked.has(p.id))
        .map(p => ({ phone: p.mobile_number as string, body: message }));
    void SecurityEventService.record({ type: 'sms_broadcast', severity: 'warning', ip: clientIp(req), userId: req.user!.id, path: req.originalUrl,
        message: `Admin sent a text broadcast for route ${routeNum} to ${recipients.length} people` });

    // Fire and forget — batch is rate-limited internally (100ms per message)
    TwilioService.sendBatch(recipients).catch(err =>
        console.error('[SMS] Broadcast error:', err)
    );

    res.json({ ok: true, sent: recipients.length });
});

export default router;
