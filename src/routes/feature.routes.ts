/*
  Feature Usage API Routes
  Tracks place searches and direction requests for the Admin Dashboard charts.
*/

import { Router, Request, Response } from 'express';
import {
    recordFeatureEvent,
    getWeeklyFeatureData,
    getDailyTrafficData,
    getTotalInteractions,
} from '../middleware/featureTracker';

const router = Router();

/**
 * POST /api/features/track
 * Body: { type: 'places' | 'directions' }
 * Called by the frontend whenever a user searches a place or requests directions.
 */
router.post('/track', async (req: Request, res: Response) => {
    try {
        const { type } = req.body;
        if (type !== 'places' && type !== 'directions') {
            res.status(400).json({ error: 'type must be "places" or "directions"' });
            return;
        }
        await recordFeatureEvent(type);
        res.json({ ok: true });
    } catch (error) {
        console.error('Feature track error:', error);
        res.status(500).json({ error: 'Failed to record event' });
    }
});

/**
 * GET /api/features/weekly
 * Returns bar-chart data: [{ day, places, directions }, ...] for the current week.
 */
router.get('/weekly', async (_req: Request, res: Response) => {
    try {
        res.json(await getWeeklyFeatureData());
    } catch (error) {
        console.error('Weekly data error:', error);
        res.status(500).json({ error: 'Failed to fetch weekly data' });
    }
});

/**
 * GET /api/features/daily
 * Returns pie-chart data: [{ name, value }, ...] for traffic distribution by weekday.
 */
router.get('/daily', async (_req: Request, res: Response) => {
    try {
        res.json(await getDailyTrafficData());
    } catch (error) {
        console.error('Daily data error:', error);
        res.status(500).json({ error: 'Failed to fetch daily data' });
    }
});

/**
 * GET /api/features/total
 * Returns the total number of recorded interactions.
 */
router.get('/total', async (_req: Request, res: Response) => {
    try {
        res.json({ total: await getTotalInteractions() });
    } catch (error) {
        console.error('Total count error:', error);
        res.status(500).json({ error: 'Failed to fetch total' });
    }
});

export default router;
