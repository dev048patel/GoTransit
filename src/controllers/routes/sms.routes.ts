import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import { supabaseServer } from '../../models/lib/supabaseServer';
import { requireAuth } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';
import { TwilioService } from '../../models/services/TwilioService';

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
    const { data: profile, error: fetchErr } = await supabaseServer
        .from('profiles')
        .select('mobile_number')
        .eq('id', userId)
        .single();

    if (fetchErr) { res.status(500).json({ error: 'Failed to fetch profile' }); return; }
    if (!profile?.mobile_number) {
        res.status(400).json({ error: 'Add a phone number to your profile before enabling SMS reminders' });
        return;
    }

    const { error } = await supabaseServer
        .from('profiles')
        .update({ sms_opted_in: true, sms_consent_at: new Date().toISOString() })
        .eq('id', userId);

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ ok: true });
});

// ── POST /api/sms/opt-out ───────────────────────────────────────────────────
router.post('/opt-out', requireAuth, async (req: Request, res: Response) => {
    const { error } = await supabaseServer
        .from('profiles')
        .update({ sms_opted_in: false })
        .eq('id', req.user!.id);

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ ok: true });
});

// ── PATCH /api/sms/phone ────────────────────────────────────────────────────
// Updates the authenticated user's mobile number.
// Opts them out automatically — they must re-consent after a number change.
router.patch('/phone', requireAuth, async (req: Request, res: Response) => {
    const { phone } = req.body as { phone?: string };
    if (!phone) { res.status(400).json({ error: 'phone is required' }); return; }
    if (!isValidPhone(phone)) {
        res.status(400).json({ error: 'Enter a valid Canadian number (+1 XXX-XXX-XXXX)' });
        return;
    }

    const { error } = await supabaseServer
        .from('profiles')
        .update({ mobile_number: normalisePhone(phone), sms_opted_in: false })
        .eq('id', req.user!.id);

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ ok: true });
});

// ── POST /api/sms/webhook ───────────────────────────────────────────────────
// Twilio calls this when a user texts back (STOP / START / HELP).
// Validated using Twilio's request signature so only Twilio can POST here.
router.post('/webhook', async (req: Request, res: Response) => {
    const authToken  = process.env.TWILIO_AUTH_TOKEN ?? '';
    const backendUrl = process.env.BACKEND_URL ?? '';

    // In production, reject requests that don't carry a valid Twilio signature
    if (process.env.NODE_ENV === 'production' && authToken && backendUrl) {
        const signature = req.headers['x-twilio-signature'] as string ?? '';
        const webhookUrl = `${backendUrl}/api/sms/webhook`;
        const valid = twilio.validateRequest(authToken, signature, webhookUrl, req.body as Record<string, string>);
        if (!valid) {
            res.status(403).send('Forbidden');
            return;
        }
    }

    const body: string = (req.body?.Body ?? '').trim().toUpperCase();
    const from: string = req.body?.From ?? '';

    if (!from) { res.status(400).send('Missing From'); return; }

    // Mirror Twilio's suppression list into our DB so the cron stays in sync
    if (body === 'STOP' || body === 'STOPALL' || body === 'UNSUBSCRIBE' || body === 'CANCEL' || body === 'END' || body === 'QUIT') {
        await supabaseServer
            .from('profiles')
            .update({ sms_opted_in: false })
            .eq('mobile_number', from);
    } else if (body === 'START' || body === 'UNSTOP' || body === 'YES') {
        await supabaseServer
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
router.post('/broadcast', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    if (!TwilioService.isConfigured()) {
        res.status(503).json({ error: 'Twilio is not configured on this server' });
        return;
    }

    const { routeNum, message } = req.body as { routeNum?: string; message?: string };
    if (!routeNum || !message) {
        res.status(400).json({ error: 'routeNum and message are required' });
        return;
    }
    if (message.length > 160) {
        res.status(400).json({ error: 'Message must be 160 characters or fewer (single SMS segment)' });
        return;
    }

    // Find users who have this route in their weekly schedule and are opted in
    const { data: schedules } = await supabaseServer
        .from('weekly_schedules')
        .select('user_id')
        .eq('route_num', routeNum)
        .eq('enabled', true);

    if (!schedules?.length) {
        res.json({ ok: true, sent: 0 });
        return;
    }

    const userIds = [...new Set(schedules.map(s => s.user_id))];

    const { data: profiles } = await supabaseServer
        .from('profiles')
        .select('mobile_number')
        .in('id', userIds)
        .eq('sms_opted_in', true)
        .not('mobile_number', 'is', null);

    const recipients = (profiles ?? [])
        .filter(p => p.mobile_number)
        .map(p => ({ phone: p.mobile_number as string, body: message }));

    // Fire and forget — batch is rate-limited internally (100ms per message)
    TwilioService.sendBatch(recipients).catch(err =>
        console.error('[SMS] Broadcast error:', err)
    );

    res.json({ ok: true, sent: recipients.length });
});

export default router;
