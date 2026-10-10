import { Router, Request, Response } from 'express';
import { supabaseServer } from '../../models/lib/supabaseServer';

const router = Router();

/* POST /api/push/subscribe
   Body: { userId, endpoint, p256dh, auth }
   Stores the browser push subscription for the authenticated user.
*/
router.post('/subscribe', async (req: Request, res: Response) => {
    const { userId, endpoint, p256dh, auth } = req.body as {
        userId?: string; endpoint?: string; p256dh?: string; auth?: string;
    };

    if (!userId || !endpoint || !p256dh || !auth) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    const { error } = await supabaseServer
        .from('push_subscriptions')
        .upsert(
            { user_id: userId, endpoint, p256dh, auth_key: auth },
            { onConflict: 'user_id,endpoint' }
        );

    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json({ ok: true });
});

/* DELETE /api/push/unsubscribe
   Body: { userId, endpoint }
*/
router.delete('/unsubscribe', async (req: Request, res: Response) => {
    const { userId, endpoint } = req.body as { userId?: string; endpoint?: string };
    if (!userId || !endpoint) { res.status(400).json({ error: 'Missing fields' }); return; }

    await supabaseServer
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint);

    res.json({ ok: true });
});

export default router;
