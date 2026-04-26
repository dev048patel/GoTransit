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
import webpush from 'web-push';
import cron from 'node-cron';
import { supabaseServer } from './models/lib/supabaseServer';

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

// ── Departure reminder cron (runs every minute, 06:00–10:00 CST = 12:00–16:00 UTC, Mon–Fri) ──
function cstNow(): { h: number; m: number; day: number } {
    const d = new Date(Date.now() - 6 * 60 * 60 * 1000); // UTC-6 (Saskatchewan — no DST)
    return { h: d.getUTCHours(), m: d.getUTCMinutes(), day: d.getUTCDay() };
}
function padded(n: number) { return n.toString().padStart(2, '0'); }
function addMins(h: number, m: number, delta: number) {
    const total = h * 60 + m + delta;
    return `${padded(Math.floor(total / 60) % 24)}:${padded(total % 60)}`;
}

cron.schedule('* 12-16 * * 1-5', async () => {
    if (!vapidPublic || !vapidPrivate) return;
    const { h, m, day } = cstNow();
    // Notify users whose departure is exactly 15 min from now
    const target = addMins(h, m, 15);

    try {
        const { data: schedules } = await supabaseServer
            .from('weekly_schedules')
            .select('user_id, route_num, arrive_by, depart_by')
            .eq('day_of_week', day)
            .eq('enabled', true)
            .eq('depart_by', target);

        if (!schedules?.length) return;

        for (const s of schedules) {
            const { data: subs } = await supabaseServer
                .from('push_subscriptions')
                .select('endpoint, p256dh, auth_key')
                .eq('user_id', s.user_id);

            for (const sub of subs ?? []) {
                const payload = JSON.stringify({
                    title: 'Time to leave! 🚌',
                    body: `Bus ${s.route_num ?? '?'} · Leave by ${s.depart_by} to arrive by ${s.arrive_by}`,
                    url: '/map',
                });
                webpush
                    .sendNotification(
                        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
                        payload
                    )
                    .catch(err => {
                        // 410 Gone = subscription expired; clean it up
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
    } catch (err) {
        console.error('[Cron] Departure reminder error:', err);
    }
});

// Start Server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});

export default app;
