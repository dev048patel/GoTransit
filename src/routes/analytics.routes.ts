/*
  Analytics API Routes
  Beacon-based visitor tracking endpoints.
*/

import { Router, Request, Response } from 'express';
import { registerSession, heartbeat, getVisitorRecords, getAnalyticsSummary } from '../middleware/visitorTracker';

const router = Router();

/*
  Helper: extract real IP from request headers.
*/
function getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    return typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.socket.remoteAddress || 'Unknown';
}

/**
 * POST /api/analytics/beacon
 * Called once when a user opens the site. Creates or reactivates their session.
 */
router.post('/beacon', (req: Request, res: Response) => {
    try {
        const ip = getClientIP(req);
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const page = req.body?.page || '/';

        const sessionId = registerSession(ip, userAgent, page);
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
router.post('/heartbeat', (req: Request, res: Response) => {
    try {
        const ip = getClientIP(req);
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const page = req.body?.page;

        heartbeat(ip, userAgent, page);
        res.json({ ok: true });
    } catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({ error: 'Failed to update heartbeat' });
    }
});

/**
 * GET /api/analytics/visitors
 * Returns unique visitor sessions (newest first).
 */
router.get('/visitors', (req: Request, res: Response) => {
    try {
        const from = req.query.from as string | undefined;
        const to = req.query.to as string | undefined;
        const records = getVisitorRecords(from, to);
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
router.get('/summary', (req: Request, res: Response) => {
    try {
        const from = req.query.from as string | undefined;
        const to = req.query.to as string | undefined;
        const summary = getAnalyticsSummary(from, to);
        res.json(summary);
    } catch (error) {
        console.error('Error fetching analytics summary:', error);
        res.status(500).json({ error: 'Failed to fetch analytics summary' });
    }
});

export default router;
