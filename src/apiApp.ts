/**
 * @file apiApp.ts
 * @description Builds the Express app: security middleware, routes, error handling.
 * Kept separate from server.ts (which listens and runs timers) so tests can use the app directly.
 */
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors'; // Cross Origin Resource Sharing : Allow cross-origin requests (Frontend -> Backend)
import transitRoutes from './controllers/routes/transit.routes';
import analyticsRoutes from './controllers/routes/analytics.routes';
import featureRoutes from './controllers/routes/feature.routes';
import pushRoutes from './controllers/routes/push.routes';
import adminRoutes from './controllers/routes/admin.routes';
import smsRoutes from './controllers/routes/sms.routes';
import weatherRoutes from './controllers/routes/weather.routes';
import authRoutes from './controllers/routes/auth.routes';
import { securityHeaders, rateLimit, clientIp } from './controllers/middleware/security';
import { SecurityEventService } from './models/services/SecurityEventService';

// Allow only specific origins to access the backend
const allowedOrigins = [
    'https://www.transitregina.ca',
    'https://transitregina.ca',
    'http://localhost:3000', // Vite dev (npm run start)
    'http://localhost:5173', // Vite dev (npm run dev)
];
// Vercel preview/branch deployments of this project (URL changes per deploy)
const vercelPreviewOrigin = /^https:\/\/go-transit-[a-z0-9-]+-dev048patels-projects\.vercel\.app$/;

class OriginNotAllowed extends Error { }

export function createApp() {
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', 1);            // one proxy (Railway) in front: req.ip is the real client
    app.use(securityHeaders);
    // A flood cap only. Many riders share one address (campus or mobile-carrier networks) and the map
    // polls every 1.5 s, so this is generous; the sensitive endpoints have their own much lower limits.
    app.use(rateLimit('all', 3000));

    app.use(cors({
        origin: (origin, callback) => {
            // No origin = not a browser (curl, server-to-server). CORS is not what protects those: the login checks are.
            if (!origin || allowedOrigins.includes(origin) || vercelPreviewOrigin.test(origin)) callback(null, true);
            else callback(new OriginNotAllowed(origin));
        },
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }));

    app.use(express.json({ limit: '20kb' })); // Parse incoming JSON request bodies (small: nothing here needs more)

    // Mount Routes
    app.use('/api', transitRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/features', featureRoutes);
    app.use('/api/push', pushRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/sms', smsRoutes);
    app.use('/api/weather', weatherRoutes);
    app.use('/api/auth', authRoutes);

    // Health Check Endpoint
    app.get('/api/status', (_req, res) => { res.json({ message: 'Backend is running!', status: 'OK' }); });

    app.use((_req, res) => { res.status(404).json({ error: 'Not found' }); });

    // Last stop for every error: log the detail on the server, tell the caller nothing about internals
    app.use((err: Error & { status?: number; type?: string }, req: Request, res: Response, _next: NextFunction) => {
        if (err instanceof OriginNotAllowed) {
            void SecurityEventService.record({ type: 'cors_blocked', severity: 'info', ip: clientIp(req), path: req.originalUrl, message: `Request from a website that is not allowed: ${err.message.slice(0, 80)}` });
            res.status(403).json({ error: 'Origin not allowed' });
            return;
        }
        if (err.type === 'entity.too.large' || err.type === 'entity.parse.failed' || (err.status && err.status < 500)) {
            res.status(err.status ?? 400).json({ error: 'Bad request' });
            return;
        }
        console.error('[Server] Unhandled error on', req.method, req.originalUrl, err);
        void SecurityEventService.record({ type: 'server_error', severity: 'warning', ip: clientIp(req), path: req.originalUrl, message: `Server error on ${req.method} ${req.path}` });
        res.status(500).json({ error: 'Something went wrong' });
    });

    return app;
}
