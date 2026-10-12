/*
  Analytics API Routes
  Beacon-based visitor tracking endpoints.
*/

import { Router, Request, Response } from 'express';
import { registerSession, heartbeat, getVisitorRecords, getAnalyticsSummary } from '../middleware/visitorTracker';
import { requireAuth, verifyRequest } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';
import { clientIp, rateLimit, isDateOnly, reject } from '../middleware/security';

const router = Router();

const trackLimit = rateLimit('analytics', 120);

/** A page path the visitor is on: must look like a path, kept short. Anything else is ignored. */
function cleanPage(v: unknown): string | undefined {
    return typeof v === 'string' && /^\/[A-Za-z0-9\/_.-]{0,120}$/.test(v) ? v : undefined;
}
/** The signed-in user, taken from the login token if one was sent — never from the request body. */
async function signedInUserId(req: Request): Promise<string | undefined> {
    return (await verifyRequest(req))?.id;
}

/**
 * POST /api/analytics/beacon
 * Called once when a user opens the site. Creates or reactivates their session.
 */
router.post('/beacon', trackLimit, async (req: Request, res: Response) => {
    try {
        const ip = clientIp(req);
        const userAgent = (req.headers['user-agent'] || 'Unknown').slice(0, 300);
        const page = cleanPage(req.body?.page) ?? '/';
        const userId = await signedInUserId(req);

        const sessionId = await registerSession(ip, userAgent, page, userId);
        res.json({ ok: true, sessionId });
    } catch (error) {
        console.error('Beacon error:', error);
        res.status(500).json({ error: 'Failed to register session' });
    }
});

/**
 * POST /api/analytics/heartbeat
 * Called every 60s by the frontend to keep the session alive.
 */
router.post('/heartbeat', trackLimit, async (req: Request, res: Response) => {
    try {
        const ip = clientIp(req);
        const userAgent = (req.headers['user-agent'] || 'Unknown').slice(0, 300);
        const page = cleanPage(req.body?.page);
        const userId = await signedInUserId(req);

        await heartbeat(ip, userAgent, page, userId);
        res.json({ ok: true });
    } catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({ error: 'Failed to update heartbeat' });
    }
});

/**
 * GET /api/analytics/visitors
 * Returns unique visitor sessions (newest first). Admins only: this is personal data.
 */
router.get('/visitors', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const from = req.query.from as string | undefined;
        const to = req.query.to as string | undefined;
        if ((from && !isDateOnly(from)) || (to && !isDateOnly(to))) { reject(req, res, 'Dates must look like 2026-01-31'); return; }
        const records = await getVisitorRecords(from, to);
        res.json(records);
    } catch (error) {
        console.error('Error fetching visitor records:', error);
        res.status(500).json({ error: 'Failed to fetch visitor data' });
    }
});

/**
 * GET /api/analytics/summary
 * Returns aggregated analytics.
 */
router.get('/summary', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const from = req.query.from as string | undefined;
        const to = req.query.to as string | undefined;
        if ((from && !isDateOnly(from)) || (to && !isDateOnly(to))) { reject(req, res, 'Dates must look like 2026-01-31'); return; }
        const summary = await getAnalyticsSummary(from, to);
        res.json(summary);
    } catch (error) {
        console.error('Error fetching analytics summary:', error);
        res.status(500).json({ error: 'Failed to fetch analytics summary' });
    }
});

export default router;
