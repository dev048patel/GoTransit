/**
 * @file server.ts
 * @description Entry point for the Express Backend Server.
 * @purpose Initializes the App, sets up middleware (CORS, JSON), and mounts routes.
 */
// Must stay the first import: loads .env.local before any module reads process.env
import './env';

import webpush from 'web-push';
import cron from 'node-cron';
import { createApp } from './apiApp';
import { serviceDb } from './models/lib/serverDb';
import { TwilioService } from './models/services/TwilioService';
import { HealthService } from './models/services/HealthService';
import { SecurityEventService } from './models/services/SecurityEventService';
import { isPushEndpoint } from './controllers/middleware/security';

const app = createApp();
const port = Number(process.env.PORT) || 3001; // Railway assigns PORT dynamically

// ── Web Push (VAPID) setup ──────────────────────────────────────────────────
const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY ?? '';
const vapidPrivate = process.env.VAPID_PRIVATE_KEY ?? '';
const vapidEmail = process.env.VAPID_EMAIL ?? 'mailto:admin@example.com';

if (vapidPublic && vapidPrivate) {
    webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);
} else {
    console.warn('[Push] VAPID keys not set — push notifications disabled');
}

// ── Departure reminder cron ─────────────────────────────────────────────────
// Runs every minute, all day — the CST time match inside naturally limits who
// gets notified. Saskatchewan is UTC-6 with no DST, year-round.

function cstNow(): { h: number; m: number; day: number } {
    const d = new Date(Date.now() - 6 * 60 * 60 * 1000);
    return { h: d.getUTCHours(), m: d.getUTCMinutes(), day: d.getUTCDay() };
}
/** Riders can write this column themselves, so only something that looks like a route number is put in a message. */
function routeLabel(v: unknown): string { return typeof v === 'string' && /^[A-Za-z0-9]{1,6}$/.test(v) ? v : '?'; }
function padded(n: number) { return n.toString().padStart(2, '0'); }
function addMins(h: number, m: number, delta: number): string {
    const total = h * 60 + m + delta;
    return `${padded(Math.floor(total / 60) % 24)}:${padded(total % 60)}`;
}

cron.schedule('* * * * *', async () => {
    const { h, m, day } = cstNow();
    // Target departure time is exactly 15 minutes from now (CST, "HH:MM")
    const target = addMins(h, m, 15);

    try {
        // Use .like() so "HH:MM" matches both text "HH:MM" and time "HH:MM:00"
        // regardless of how Supabase stores the column type.
        const { data: schedules } = await serviceDb()
            .from('weekly_schedules')
            .select('user_id, route_num, arrive_by, depart_by')
            .eq('day_of_week', day)
            .eq('enabled', true)
            .like('depart_by', `${target}%`);

        if (!schedules?.length) return;

        // ── Collect user profiles for Twilio (single batch query) ──────────
        const userIds = schedules.map(s => s.user_id);
        const { data: profiles } = await serviceDb()
            .from('profiles')
            .select('id, mobile_number, sms_opted_in, mobile_verified')
            .in('id', userIds);

        const profileMap = new Map(
            (profiles ?? []).map(p => [p.id, p])
        );

        // ── SMS via Twilio ──────────────────────────────────────────────────
        if (TwilioService.isConfigured()) {
            const recipients = schedules.flatMap(s => {
                const profile = profileMap.get(s.user_id);
                if (!profile?.sms_opted_in || !profile?.mobile_number || !profile?.mobile_verified) return [];
                const departLabel = (s.depart_by ?? target).slice(0, 5);
                const arriveLabel = (s.arrive_by ?? '').slice(0, 5);
                return [{
                    phone: profile.mobile_number as string,
                    body: `Transit Regina: Leave by ${departLabel} for Bus ${routeLabel(s.route_num)} → arrive by ${arriveLabel}. Reply STOP to unsubscribe.`,
                }];
            });
            if (recipients.length) await TwilioService.sendBatch(recipients);
        }

        // ── Web Push (kept as secondary channel) ───────────────────────────
        if (vapidPublic && vapidPrivate) {
            for (const s of schedules) {
                const { data: subs } = await serviceDb()
                    .from('push_subscriptions')
                    .select('endpoint, p256dh, auth_key')
                    .eq('user_id', s.user_id);

                const departLabel = (s.depart_by ?? target).slice(0, 5);
                const payload = JSON.stringify({
                    title: 'Time to leave!',
                    body: `Bus ${routeLabel(s.route_num)} · Leave by ${departLabel} to arrive by ${String(s.arrive_by ?? '').slice(0, 5)}`,
                    url: '/map',
                });

                for (const sub of subs ?? []) {
                    if (!isPushEndpoint(sub.endpoint)) continue;   // riders can write this table directly
                    webpush
                        .sendNotification(
                            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
                            payload
                        )
                        .catch(err => {
                            if (err.statusCode === 410) {
                                serviceDb()
                                    .from('push_subscriptions')
                                    .delete()
                                    .eq('endpoint', sub.endpoint)
                                    .then(() => {});
                            }
                        });
                }
            }
        }
    } catch (err) {
        console.error('[Cron] Departure reminder error:', err);
    }
});

// ── Watching the site: health checks and data retention ──────────────────────
// Every 5 minutes: is the database reachable, is the bus feed answering? Admins are emailed
// when one stops for two checks in a row, and the Security page shows the current state.
cron.schedule('*/5 * * * *', () => { HealthService.run().catch(err => console.error('[Health] Check failed:', err)); });
HealthService.run().catch(() => { });

// Once a day: delete visitor records (IP addresses) older than 90 days, and old security events.
const RETENTION_DAYS = 90;
cron.schedule('20 3 * * *', async () => {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
    const { error } = await serviceDb().from('visitor_sessions').delete().lt('last_seen', cutoff);
    if (error) console.error('[Retention] Visitor cleanup failed:', error.message);
    const { error: evErr } = await serviceDb().from('security_events').delete().lt('created_at', cutoff);
    if (evErr) console.error('[Retention] Event cleanup failed:', evErr.message);
    const { error: usageErr } = await serviceDb().from('feature_events').delete().lt('created_at', cutoff);
    if (usageErr) console.error('[Retention] Usage cleanup failed:', usageErr.message);
});

// A crash should reach the admins, not just the log
process.on('unhandledRejection', (reason) => {
    console.error('[Server] Unhandled rejection:', reason);
    void SecurityEventService.record({ type: 'server_error', severity: 'critical', message: 'The backend hit an unexpected error outside a request' });
});

// Start Server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});

export default app;
