import { Router } from 'express';
import { WeatherService } from '../../models/services/WeatherService';

const router = Router();

// Public — anyone (authenticated or not) may fetch current weather.
// Environment Canada data is public; no user-specific data is exposed.
router.get('/current', async (_req, res) => {
    try {
        const snapshot = await WeatherService.getCurrent();
        res.json(snapshot);
    } catch (err: any) {
        console.error('[Weather] Failed to fetch EC data:', err?.message);
        res.status(502).json({ error: 'Could not retrieve weather data. Please try again shortly.' });
    }
});

export default router;
