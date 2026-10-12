import { Router, Request, Response } from 'express';
import { userDb } from '../../models/lib/serverDb';
import { requireAuth } from '../middleware/requireAuth';
import { isText, reject } from '../middleware/security';

const router = Router();

// Every route needs a signed-in user. Whose subscription it is comes from the login token,
// and the database is called as that user, so row-level security applies too.
router.use(requireAuth);

/* POST /api/push/subscribe
   Body: { endpoint, p256dh, auth }
*/
router.post('/subscribe', async (req: Request, res: Response) => {
    const { endpoint, p256dh, auth } = req.body ?? {};
    const userId = req.user!.id;
    if (!isText(endpoint, 1000) || !/^https:\/\//.test(endpoint) || !isText(p256dh, 300) || !isText(auth, 300)) {
        reject(req, res, 'Invalid push subscription');
        return;
    }

    const { error } = await userDb(req.user!.token)
        .from('push_subscriptions')
        .upsert(
            { user_id: userId, endpoint, p256dh, auth_key: auth },
            { onConflict: 'user_id,endpoint' }
        );

    if (error) {
        console.error('[Push] Subscribe error:', error.message);
        res.status(500).json({ error: 'Could not save the subscription' });
        return;
    }
    res.json({ ok: true });
});

/* DELETE /api/push/unsubscribe
   Body: { endpoint }
*/
router.delete('/unsubscribe', async (req: Request, res: Response) => {
    const { endpoint } = req.body ?? {};
    const userId = req.user!.id;
    if (!isText(endpoint, 1000)) { reject(req, res, 'Invalid push subscription'); return; }

    await userDb(req.user!.token)
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint);

    res.json({ ok: true });
});

export default router;
