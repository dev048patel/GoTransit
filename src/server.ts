/**
 * @file server.ts
 * @description Entry point for the Express Backend Server.
 * @purpose Initializes the App, sets up middleware (CORS, JSON), and mounts routes.
 */
import dotenv from 'dotenv';
// Load environment variables from .env.local (only needed locally; Railway sets vars directly)
dotenv.config({ path: '.env.local' });

import express from 'express';
import cors from 'cors'; // Cross Origin Resource Sharing : Allow cross-origin requests (Frontend -> Backend) like React -> Node.js ( Port 3000 -> Port 3001)
import transitRoutes from './controllers/routes/transit.routes';
import analyticsRoutes from './controllers/routes/analytics.routes';
import featureRoutes from './controllers/routes/feature.routes';
import pushRoutes from './controllers/routes/push.routes';
import adminRoutes from './controllers/routes/admin.routes';
import smsRoutes from './controllers/routes/sms.routes';
import weatherRoutes from './controllers/routes/weather.routes';
import webpush from 'web-push';
import cron from 'node-cron';
import { supabaseServer } from './models/lib/supabaseServer';
import { TwilioService } from './models/services/TwilioService';

const app = express();
const port = Number(process.env.PORT) || 3001; // Railway assigns PORT dynamically

// Allow only specific origins to access the backend
// Access-Control-Allow-Origin : Allow this domain to access our API
const allowedOrigins = [
    'https://www.gotransitregina.ca',
    'https://gotransitregina.ca',
    'https://gotransit-production.up.railway.app', // Railway deployment
    'http://localhost:3000', // Vite dev (npm run start)
    'http://localhost:5173', // Vite dev (npm run dev)
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin ${origin} not allowed`));
        }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));


// Middleware

app.use(express.json()); // Parse incoming JSON request bodies

// Mount Routes
app.use('/api', transitRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/weather', weatherRoutes);

// Health Check Endpoint
app.get('/api/status', (_req, res) => {
    res.json({ message: 'Backend is running!', status: 'OK' });
});

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
        const { data: schedules } = await supabaseServer
            .from('weekly_schedules')
            .select('user_id, route_num, arrive_by, depart_by')
            .eq('day_of_week', day)
            .eq('enabled', true)
            .like('depart_by', `${target}%`);

        if (!schedules?.length) return;

        // ── Collect user profiles for Twilio (single batch query) ──────────
        const userIds = schedules.map(s => s.user_id);
        const { data: profiles } = await supabaseServer
            .from('profiles')
            .select('id, mobile_number, sms_opted_in')
            .in('id', userIds);

        const profileMap = new Map(
            (profiles ?? []).map(p => [p.id, p])
        );

        // ── SMS via Twilio ──────────────────────────────────────────────────
        if (TwilioService.isConfigured()) {
            const recipients = schedules.flatMap(s => {
                const profile = profileMap.get(s.user_id);
                if (!profile?.sms_opted_in || !profile?.mobile_number) return [];
                const departLabel = (s.depart_by ?? target).slice(0, 5);
                const arriveLabel = (s.arrive_by ?? '').slice(0, 5);
                return [{
                    phone: profile.mobile_number as string,
                    body: `GoTransit: Leave by ${departLabel} for Bus ${s.route_num ?? '?'} → arrive by ${arriveLabel}. Reply STOP to unsubscribe.`,
                }];
            });
            if (recipients.length) await TwilioService.sendBatch(recipients);
        }

        // ── Web Push (kept as secondary channel) ───────────────────────────
        if (vapidPublic && vapidPrivate) {
            for (const s of schedules) {
                const { data: subs } = await supabaseServer
                    .from('push_subscriptions')
                    .select('endpoint, p256dh, auth_key')
                    .eq('user_id', s.user_id);

                const departLabel = (s.depart_by ?? target).slice(0, 5);
                const payload = JSON.stringify({
                    title: 'Time to leave!',
                    body: `Bus ${s.route_num ?? '?'} · Leave by ${departLabel} to arrive by ${s.arrive_by}`,
                    url: '/map',
                });

                for (const sub of subs ?? []) {
                    webpush
                        .sendNotification(
                            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
                            payload
                        )
                        .catch(err => {
                            if (err.statusCode === 410) {
                                supabaseServer
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

// Start Server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});

export default app;
