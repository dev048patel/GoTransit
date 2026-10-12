/**
 * Sign-in helpers that must not be callable without limits.
 */
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { serviceDb } from '../../models/lib/serverDb';
import { isText, rateLimit } from '../middleware/security';

const router = Router();
const MOBILE = /^\+1 \d{3}-\d{3}-\d{4}$/;

// POST /api/auth/login-mobile  { mobile: "+1 306-555-0199", password } → { access_token, refresh_token }
// Sign-in with a phone number. The backend finds the account and signs in itself, so the caller
// never learns which email a number belongs to. Every failure looks the same, and it is limited
// to a few tries a minute per address.
router.post('/login-mobile', rateLimit('login-mobile', 5), async (req: Request, res: Response) => {
    const { mobile, password } = req.body ?? {};
    const refuse = () => { res.status(401).json({ error: 'Invalid credentials' }); };
    if (typeof mobile !== 'string' || !MOBILE.test(mobile) || !isText(password, 200)) { refuse(); return; }

    const { data: email, error } = await serviceDb().rpc('get_email_by_mobile', { mobile });
    if (error) { console.error('[Auth] Mobile lookup failed:', error.message); res.status(503).json({ error: 'Mobile sign-in is unavailable right now' }); return; }
    if (typeof email !== 'string') { refuse(); return; }

    // A throwaway client: nothing about this login is kept on the server
    const auth = createClient(process.env.VITE_SUPABASE_URL as string, process.env.VITE_SUPABASE_ANON_KEY as string, { auth: { autoRefreshToken: false, persistSession: false } }).auth;
    const { data, error: signInErr } = await auth.signInWithPassword({ email, password });
    if (signInErr || !data.session) { refuse(); return; }
    res.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
});

export default router;
