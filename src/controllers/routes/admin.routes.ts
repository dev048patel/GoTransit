/**
 * Admin API. Every route here requires a signed-in admin: the two guards below run first.
 * The acting admin is always taken from the verified login token, never from the request body.
 */
import { Router, Request, Response } from 'express';
import { getSupabaseAdmin } from '../../models/lib/supabaseAdmin';
import { serviceDb, hasServiceKey } from '../../models/lib/serverDb';
import { requireAuth } from '../middleware/requireAuth';
import { requireAdmin, requireFreshTwoStep } from '../middleware/requireAdmin';
import { clientIp, isUuid, isText, reject } from '../middleware/security';
import { SecurityEventService } from '../../models/services/SecurityEventService';
import { HealthService } from '../../models/services/HealthService';
import { RealTimeService } from '../../models/services/RealTimeService';
import { reginaDateKey, startOfReginaDay } from '../../models/services/ReginaTime';

const router = Router();
router.use(requireAuth, requireAdmin);

const FEATURE_KEY = /^[a-z][a-z0-9_]{1,40}$/;
const audit = (req: Request, type: string, message: string, severity: 'info' | 'warning' | 'critical' = 'info') =>
    SecurityEventService.record({ type, severity, message, ip: clientIp(req), userId: req.user!.id, path: req.originalUrl });

/** Things an admin did (as opposed to things that happened to the site). Shown in the activity log. */
const ADMIN_ACTIONS = ['user_deleted', 'role_changed', 'status_changed', 'user_updated', 'feature_access_changed', 'route_changed', 'sms_broadcast', 'personal_data_viewed', 'events_handled'];
/** An optional reason typed by the admin, tidied for the log. */
const reasonOf = (req: Request) => (typeof req.body?.reason === 'string' && req.body.reason.trim() ? ` Reason: ${req.body.reason.trim().slice(0, 200)}` : '');
const countOf = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

/** Critical events nobody has marked as handled yet. Counts them all if the handled columns are not there yet (script 003). */
async function unhandledCriticalSince(since: string): Promise<number> {
    const q = () => serviceDb().from('security_events').select('*', { count: 'exact', head: true }).eq('severity', 'critical').gte('created_at', since);
    const r = await q().is('handled_at', null);
    return r.error ? countOf(q()) : r.count ?? 0;
}

/** Adds each event's admin name, so the log reads "Dev Patel did X" rather than an id. */
async function withAdminNames<T extends { user_id: string | null }>(rows: T[]) {
    const ids = [...new Set(rows.map(r => r.user_id).filter((v): v is string => !!v))];
    const { data } = ids.length ? await serviceDb().from('profiles').select('id, full_name, email').in('id', ids) : { data: [] };
    const names = new Map((data ?? []).map(p => [p.id, p.full_name || p.email || 'Unknown']));
    return rows.map(r => ({ ...r, admin: r.user_id ? names.get(r.user_id) ?? 'Unknown' : 'System' }));
}

// ── Home: is everything okay, and how big is the app right now? ──
router.get('/overview', async (_req: Request, res: Response) => {
    const db = serviceDb(), now = Date.now();
    const fiveMinAgo = new Date(now - 5 * 60_000).toISOString(), dayAgo = new Date(now - 86_400_000).toISOString();
    const today = startOfReginaDay(0).toISOString(), weekAgo = startOfReginaDay(-6).toISOString();
    const head = { count: 'exact' as const, head: true };

    const [activeNow, signedInNow, visitorsToday, totalUsers, signupsToday, signupsWeek, criticalDay, searches, newVisitors, recent, buses] = await Promise.all([
        countOf(db.from('visitor_sessions').select('*', head).gte('last_seen', fiveMinAgo)),
        countOf(db.from('profiles').select('*', head).gte('last_active', fiveMinAgo)),
        countOf(db.from('visitor_sessions').select('*', head).gte('last_seen', today)),
        countOf(db.from('profiles').select('*', head)),
        countOf(db.from('profiles').select('*', head).gte('created_at', today)),
        countOf(db.from('profiles').select('*', head).gte('created_at', weekAgo)),
        unhandledCriticalSince(dayAgo),
        db.from('feature_events').select('type, created_at').gte('created_at', weekAgo).limit(20000),
        db.from('visitor_sessions').select('first_seen').gte('first_seen', weekAgo).limit(20000),
        db.from('security_events').select('type, severity, message, user_id, created_at').in('type', ADMIN_ACTIONS).order('created_at', { ascending: false }).limit(8),
        RealTimeService.getLiveBuses().then(b => b.length).catch(() => null),
    ]);

    // Seven Regina days, oldest first
    const days = Array.from({ length: 7 }, (_, i) => reginaDateKey(startOfReginaDay(i - 6)));
    const trend = days.map(day => ({ day, places: 0, directions: 0, visitors: 0 }));
    const byDay = new Map(trend.map(t => [t.day, t]));
    for (const e of searches.data ?? []) { const t = byDay.get(reginaDateKey(e.created_at)); if (t && (e.type === 'places' || e.type === 'directions')) t[e.type as 'places' | 'directions']++; }
    for (const v of newVisitors.data ?? []) { const t = byDay.get(reginaDateKey(v.first_seen)); if (t) t.visitors++; }
    const todayRow = trend[trend.length - 1];

    const health = HealthService.report();
    const attention = [
        ...health.checks.filter(c => !c.ok).map(c => ({ level: 'critical', text: `${c.name} is down: ${c.detail}`, link: '/admin/security' })),
        ...(criticalDay ? [{ level: 'critical', text: `${criticalDay} critical security event${criticalDay === 1 ? '' : 's'} in the last 24 hours`, link: '/admin/security' }] : []),
        ...health.config.map(text => ({ level: 'warning', text, link: '/admin/security' })),
    ];

    res.json({
        at: new Date(now).toISOString(),
        live: { activeNow, signedInNow, buses },
        today: { visitors: visitorsToday, places: todayRow.places, directions: todayRow.directions, signups: signupsToday },
        totals: { users: totalUsers, signupsWeek },
        trend, attention,
        recent: await withAdminNames(recent.data ?? []),
    });
});

// ── Activity log: who did what, newest first ──
router.get('/activity', async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const { data, error } = await serviceDb().from('security_events').select('type, severity, message, user_id, ip, created_at')
        .in('type', ADMIN_ACTIONS).order('created_at', { ascending: false }).limit(limit);
    if (error) { console.error('[Admin] Activity error:', error.message); res.status(500).json({ error: 'Could not load the activity log' }); return; }
    res.json(await withAdminNames(data ?? []));
});

// ── One person: everything about them in one answer ──
router.get('/users/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!isUuid(id)) { reject(req, res, 'Invalid user id'); return; }
    const db = serviceDb();
    const [profile, features, sessions, history] = await Promise.all([
        db.from('profiles').select('id, full_name, email, role, account_status, mobile_number, sms_opted_in, created_at, last_active').eq('id', id).maybeSingle(),
        db.from('feature_access').select('feature, enabled').eq('user_id', id),
        db.from('visitor_sessions').select('browser, os, device, first_seen, last_seen, page_views').eq('user_id', id).order('last_seen', { ascending: false }).limit(10),
        // ponytail: finds actions on this person by their id in the message text; add a target_id column if the log grows large
        db.from('security_events').select('type, severity, message, user_id, created_at').in('type', ADMIN_ACTIONS).ilike('message', `%${id}%`).order('created_at', { ascending: false }).limit(30),
    ]);
    if (!profile.data) { res.status(404).json({ error: 'No such user' }); return; }
    res.json({ profile: profile.data, features: features.data ?? [], sessions: sessions.data ?? [], history: await withAdminNames(history.data ?? []) });
});

// Looking at personal data that is hidden by default (full IP addresses) is itself recorded
router.post('/reveal', async (req: Request, res: Response) => {
    const what = req.body?.what;
    if (!isText(what, 60)) { reject(req, res, 'Invalid request'); return; }
    await audit(req, 'personal_data_viewed', `Admin revealed ${what.trim()}`);
    res.json({ ok: true });
});

// Hard-delete a user from auth.users (cascades to profiles via FK)
router.delete('/users/:id', requireFreshTwoStep, async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!isUuid(id)) { reject(req, res, 'Invalid user id'); return; }
    if (id === req.user!.id) { reject(req, res, 'You cannot delete your own account from the admin panel'); return; }
    const { error } = await getSupabaseAdmin().auth.admin.deleteUser(id);
    if (error) { console.error('[Admin] Delete user error:', error.message); res.status(500).json({ error: 'Could not delete the user' }); return; }
    await audit(req, 'user_deleted', `Admin deleted user ${id}.${reasonOf(req)}`, 'critical');
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
    // Handing out admin power needs a freshly entered authenticator code
    if (role === 'admin' && Date.now() / 1000 - req.user!.twoStepAt > 10 * 60) {
        res.status(403).json({ error: 'Enter your authenticator code again to do this', code: 'fresh_two_step_required' });
        return;
    }

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
    if (role !== undefined) await audit(req, 'role_changed', `Admin set user ${id} to role "${role}".${reasonOf(req)}`, 'critical');
    if (account_status !== undefined) await audit(req, 'status_changed', `Admin set user ${id} to status "${account_status}".${reasonOf(req)}`, 'warning');
    if (full_name !== undefined && role === undefined && account_status === undefined) await audit(req, 'user_updated', `Admin renamed user ${id}`);
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
    let canHandle = false;
    if (hasServiceKey()) {
        const cols = 'type, severity, message, ip, user_id, path, created_at';
        const q = (c: string) => serviceDb().from('security_events').select(c).order('created_at', { ascending: false }).limit(limit);
        // Events an admin has dealt with are left out unless asked for
        let { data, error } = await (req.query.handled === '1' ? q(`id, handled_at, ${cols}`) : q(`id, handled_at, ${cols}`).is('handled_at', null));
        canHandle = !error;
        if (error) ({ data, error } = await q(cols));   // the handled columns are added by script 003
        if (!error && data) {
            stored = true;
            events = (data as any[]).map(r => ({ id: r.id, handledAt: r.handled_at ?? null, type: r.type, severity: r.severity, message: r.message, ip: r.ip, userId: r.user_id, path: r.path, at: r.created_at }));
        }
    }
    res.json({ events, stored, canHandle, health: HealthService.report() });
});

// Mark events as dealt with. They are hidden from the default view, never deleted.
router.post('/security/handled', async (req: Request, res: Response) => {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || !ids.length || ids.length > 500 || !ids.every(n => Number.isInteger(n) && n > 0)) { reject(req, res, 'Invalid event list'); return; }
    const { data, error } = await serviceDb().from('security_events')
        .update({ handled_at: new Date().toISOString(), handled_by: req.user!.id }).in('id', ids).is('handled_at', null).select('id');
    if (error) { console.error('[Admin] Mark handled error:', error.message); res.status(500).json({ error: 'Could not update the events. Has script 003 been run?' }); return; }
    await audit(req, 'events_handled', `Admin marked ${data?.length ?? 0} security event${data?.length === 1 ? '' : 's'} as handled`);
    res.json({ handled: data?.length ?? 0 });
});

export default router;
