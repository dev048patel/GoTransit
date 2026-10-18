/**
 * Sign-in helpers that must not be callable without limits.
 */
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { serviceDb } from '../../models/lib/serverDb';
import { isText, rateLimit } from '../middleware/security';
import { requireAuth } from '../middleware/requireAuth';
import { getSupabaseAdmin } from '../../models/lib/supabaseAdmin';
import { SITE } from '../../models/data/legal';

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

/**
 * Re-checks the signed-in rider's password before a sensitive action (OWASP: re-authenticate for
 * sensitive features; GitHub calls this "sudo mode"). Uses a throwaway session that is ended at once.
 */
async function passwordIsCorrect(email: string | undefined, password: unknown): Promise<boolean> {
    if (!email || !isText(password, 200)) return false;
    const auth = createClient(process.env.VITE_SUPABASE_URL as string, process.env.VITE_SUPABASE_ANON_KEY as string, { auth: { autoRefreshToken: false, persistSession: false } }).auth;
    const { data, error } = await auth.signInWithPassword({ email, password: password as string });
    if (error || !data.session) return false;
    await auth.signOut({ scope: 'local' });
    return true;
}

// POST /api/auth/confirm-password { password } → { ok: true } | 401
// Asked before changing the password, so an unlocked device alone isn't enough to take over the account.
router.post('/confirm-password', requireAuth, rateLimit('confirm-password', 5), async (req: Request, res: Response) => {
    if (await passwordIsCorrect(req.user!.email, req.body?.password)) res.json({ ok: true });
    else res.status(401).json({ error: 'That password is not right.' });
});

// POST /api/auth/accept-terms → { ok: true, version }
// Records that the signed-in account agrees to the current Terms and Privacy policy. The time is
// the server's, and the profile columns can only be written from here (see 006_terms_acceptance.sql).
router.post('/accept-terms', requireAuth, rateLimit('accept-terms', 10), async (req: Request, res: Response) => {
    const id = req.user!.id;
    const acceptedAt = new Date().toISOString();
    const { error } = await serviceDb().from('profiles')
        .update({ terms_version: SITE.TERMS_VERSION, terms_accepted_at: acceptedAt })
        .eq('id', id);
    if (error && error.code !== '42703') {   // 42703: the columns are not set up yet; the copy below still records it
        console.error('[Auth] Could not record terms agreement:', error.message);
        res.status(500).json({ error: 'Your agreement could not be saved. Please try again.' });
        return;
    }
    /* A copy on the sign-in record too, so the agreement is kept even before the columns exist */
    await getSupabaseAdmin().auth.admin.updateUserById(id, { user_metadata: { terms_version: SITE.TERMS_VERSION, terms_accepted_at: acceptedAt } });
    res.json({ ok: true, version: SITE.TERMS_VERSION });
});

/* Every table that holds something about one rider, and the column that names them */
const RIDER_DATA: [table: string, column: string][] = [
    ['favourite_stops', 'user_id'],
    ['favourite_routes', 'user_id'],
    ['saved_destinations', 'user_id'],
    ['weekly_schedules', 'user_id'],
    ['push_subscriptions', 'user_id'],
    ['feature_access', 'user_id'],
    ['visitor_sessions', 'user_id'],
    ['user_preferences', 'id'],
    ['profiles', 'id'],
];

// DELETE /api/auth/account { password } → { ok: true }
// Deletes the signed-in rider's account and everything stored about them, once they have re-entered
// their password. Security-log entries are kept, because they record what happened to the service,
// but they no longer name the person.
router.delete('/account', requireAuth, rateLimit('delete-account', 3), async (req: Request, res: Response) => {
    if (!(await passwordIsCorrect(req.user!.email, req.body?.password))) {
        res.status(401).json({ error: 'That password is not right.' });
        return;
    }
    const id = req.user!.id;
    const db = serviceDb();
    for (const [table, column] of RIDER_DATA) {
        const { error } = await db.from(table).delete().eq(column, id);
        if (error) {
            console.error(`[Auth] Account deletion stopped at ${table}:`, error.message);
            res.status(500).json({ error: 'Your account could not be fully deleted. Please try again, or contact us and we will finish it.' });
            return;
        }
    }
    await db.from('security_events').update({ user_id: null }).eq('user_id', id);
    const { error } = await getSupabaseAdmin().auth.admin.deleteUser(id);
    if (error) {
        console.error('[Auth] Sign-in record could not be deleted:', error.message);
        res.status(500).json({ error: 'Your data was deleted, but your sign-in could not be. Please try again, or contact us and we will finish it.' });
        return;
    }
    res.json({ ok: true });
});

export default router;
