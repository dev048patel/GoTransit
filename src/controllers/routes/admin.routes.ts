/**
 * Admin API. Every route here requires a signed-in admin: the two guards below run first.
 * The acting admin is always taken from the verified login token, never from the request body.
 */
import { Router, Request, Response } from 'express';
import { getSupabaseAdmin } from '../../models/lib/supabaseAdmin';
import { serviceDb, hasServiceKey } from '../../models/lib/serverDb';
import { requireAuth } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';
import { clientIp, isUuid, isText, reject } from '../middleware/security';
import { SecurityEventService } from '../../models/services/SecurityEventService';
import { HealthService } from '../../models/services/HealthService';

const router = Router();
router.use(requireAuth, requireAdmin);

const FEATURE_KEY = /^[a-z][a-z0-9_]{1,40}$/;
const audit = (req: Request, type: string, message: string, severity: 'info' | 'warning' | 'critical' = 'info') =>
    SecurityEventService.record({ type, severity, message, ip: clientIp(req), userId: req.user!.id, path: req.originalUrl });

// Hard-delete a user from auth.users (cascades to profiles via FK)
router.delete('/users/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!isUuid(id)) { reject(req, res, 'Invalid user id'); return; }
    if (id === req.user!.id) { reject(req, res, 'You cannot delete your own account from the admin panel'); return; }
    const { error } = await getSupabaseAdmin().auth.admin.deleteUser(id);
    if (error) { console.error('[Admin] Delete user error:', error.message); res.status(500).json({ error: 'Could not delete the user' }); return; }
    await audit(req, 'user_deleted', `Admin deleted user ${id}`, 'critical');
    res.json({ ok: true });
});

// Change a user's name, role or status. Suspending also blocks their login at the auth server,
// so a token they already hold stops working when it next refreshes.
router.patch('/users/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { full_name, role, account_status } = req.body ?? {};
    if (!isUuid(id)) { reject(req, res, 'Invalid user id'); return; }
    if (full_name !== undefined && !isText(full_name, 80)) { reject(req, res, 'Invalid name'); return; }
    if (role !== undefined && role !== 'user' && role !== 'admin') { reject(req, res, 'Invalid role'); return; }
    if (account_status !== undefined && !['active', 'suspended', 'deleted'].includes(account_status)) { reject(req, res, 'Invalid status'); return; }
    if (id === req.user!.id && (role === 'user' || (account_status && account_status !== 'active'))) { reject(req, res, 'You cannot demote or suspend yourself'); return; }

    const fields: Record<string, string> = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) fields.full_name = full_name.trim();
    if (role !== undefined) fields.role = role;
    if (account_status !== undefined) fields.account_status = account_status;
    const { error } = await getSupabaseAdmin().from('profiles').update(fields).eq('id', id);
    if (error) { console.error('[Admin] Update user error:', error.message); res.status(500).json({ error: 'Could not update the user' }); return; }
    if (account_status !== undefined) {
        const { error: banErr } = await getSupabaseAdmin().auth.admin.updateUserById(id, { ban_duration: account_status === 'active' ? 'none' : '876000h' });
        if (banErr) console.error('[Admin] Ban sync error:', banErr.message);
    }
    if (role !== undefined) await audit(req, 'role_changed', `Admin set user ${id} to role "${role}"`, 'critical');
    if (account_status !== undefined) await audit(req, 'status_changed', `Admin set user ${id} to status "${account_status}"`, 'warning');
    res.json({ ok: true });
});

// Set a single feature flag for one user
router.post('/fac/set', async (req: Request, res: Response) => {
    const { userId, feature, enabled } = req.body ?? {};
    if (!isUuid(userId) || typeof feature !== 'string' || !FEATURE_KEY.test(feature) || typeof enabled !== 'boolean') { reject(req, res, 'Invalid feature access request'); return; }
    const { error } = await getSupabaseAdmin().from('feature_access')
        .upsert({ user_id: userId, feature, enabled, updated_by: req.user!.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id,feature' });
    if (error) { console.error('[Admin] Set feature error:', error.message); res.status(500).json({ error: 'Could not save the change' }); return; }
    await audit(req, 'feature_access_changed', `Admin turned "${feature}" ${enabled ? 'on' : 'off'} for user ${userId}`);
    res.json({ ok: true });
});

// Delete all feature_access rows for a user (resets to full access)
router.delete('/fac/reset/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    if (!isUuid(userId)) { reject(req, res, 'Invalid user id'); return; }
    const { error } = await getSupabaseAdmin().from('feature_access').delete().eq('user_id', userId);
    if (error) { console.error('[Admin] Reset access error:', error.message); res.status(500).json({ error: 'Could not save the change' }); return; }
    await audit(req, 'feature_access_changed', `Admin reset feature access for user ${userId}`);
    res.json({ ok: true });
});

// Toggle a feature for ALL users at once
router.post('/fac/set-all', async (req: Request, res: Response) => {
    const { feature, enabled, userIds } = req.body ?? {};
    if (typeof feature !== 'string' || !FEATURE_KEY.test(feature) || typeof enabled !== 'boolean') { reject(req, res, 'Invalid feature access request'); return; }
    if (!enabled && (!Array.isArray(userIds) || userIds.length > 5000 || !userIds.every(isUuid))) { reject(req, res, 'Invalid user list'); return; }

    const db = getSupabaseAdmin();
    const { error } = enabled
        ? await db.from('feature_access').delete().eq('feature', feature)
        : await db.from('feature_access').upsert(
            (userIds as string[]).map(userId => ({ user_id: userId, feature, enabled: false, updated_by: req.user!.id, updated_at: new Date().toISOString() })),
            { onConflict: 'user_id,feature' });
    if (error) { console.error('[Admin] Set-all error:', error.message); res.status(500).json({ error: 'Could not save the change' }); return; }
    await audit(req, 'feature_access_changed', `Admin turned "${feature}" ${enabled ? 'on' : 'off'} for all users`, 'warning');
    res.json({ ok: true });
});

// What the Security page shows: recent events, and whether the things the site depends on are up
router.get('/security', async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    let events: unknown[] = SecurityEventService.recent(limit), stored = false;
    if (hasServiceKey()) {
        const { data, error } = await serviceDb().from('security_events').select('type, severity, message, ip, user_id, path, created_at').order('created_at', { ascending: false }).limit(limit);
        if (!error && data) { stored = true; events = data.map(r => ({ type: r.type, severity: r.severity, message: r.message, ip: r.ip, userId: r.user_id, path: r.path, at: r.created_at })); }
    }
    res.json({ events, stored, health: HealthService.report() });
});

export default router;
