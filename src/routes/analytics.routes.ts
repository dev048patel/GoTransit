/*
  Analytics API Routes
  Exposes visitor tracking data to the admin frontend.
*/

import { Router, Request, Response } from 'express';
import { getVisitorRecords, getAnalyticsSummary } from '../middleware/visitorTracker';

const router = Router();

/**
 * GET /api/analytics/visitors
 * Returns the raw list of recent visitors (newest first).
 */
router.get('/visitors', (req: Request, res: Response) => {
    try {
        const records = getVisitorRecords();
        res.json(records);
    } catch (error) {
        console.error('Error fetching visitor records:', error);
        res.status(500).json({ error: 'Failed to fetch visitor data' });
    }
});

/**
 * GET /api/analytics/summary
 * Returns aggregated analytics (browser breakdown, device types, top pages, etc.)
 */
router.get('/summary', (req: Request, res: Response) => {
    try {
        const summary = getAnalyticsSummary();
        res.json(summary);
    } catch (error) {
        console.error('Error fetching analytics summary:', error);
        res.status(500).json({ error: 'Failed to fetch analytics summary' });
    }
});

export default router;
