/**
 * Sign-in helpers that must not be callable without limits.
 */
import { Router, Request, Response } from 'express';
import { serviceDb } from '../../models/lib/serverDb';
import { rateLimit } from '../middleware/security';

const router = Router();
const MOBILE = /^\+1 \d{3}-\d{3}-\d{4}$/;

// POST /api/auth/resolve-mobile  { mobile: "+1 306-555-0199" } → { email | null }
// Lets people sign in with a phone number. It reveals which email a number belongs to, so it is
// limited to a few tries a minute per address; the database function behind it is not public.
router.post('/resolve-mobile', rateLimit('resolve-mobile', 5), async (req: Request, res: Response) => {
    const mobile = req.body?.mobile;
    if (typeof mobile !== 'string' || !MOBILE.test(mobile)) { res.json({ email: null }); return; }
    const { data, error } = await serviceDb().rpc('get_email_by_mobile', { mobile });
    if (error) { console.error('[Auth] Mobile lookup failed:', error.message); res.status(503).json({ error: 'Mobile sign-in is unavailable right now' }); return; }
    res.json({ email: typeof data === 'string' ? data : null });
});

export default router;
