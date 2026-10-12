/**
 * Security tests for the backend API.  Run:  npm test
 *
 * The real Express app is started against a small stand-in for Supabase (below), so the
 * tests exercise the actual guards, validation and alerting end to end without touching
 * any real data.
 */
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const SUSPENDED = '33333333-3333-4333-8333-333333333333';
const OTHER = '44444444-4444-4444-8444-444444444444';
/** A token shaped like Supabase's: the middle part says whether the login passed the second step (aal2). */
const jwt = (sub: string, aal: 'aal1' | 'aal2', codeAgeSeconds = 30) =>
    ['e30', Buffer.from(JSON.stringify({ sub, aal, amr: aal === 'aal2' ? [{ method: 'password', timestamp: 1 }, { method: 'totp', timestamp: Math.floor(Date.now() / 1000) - codeAgeSeconds }] : [{ method: 'password', timestamp: 1 }] })).toString('base64url'), 'signature'].join('.');
const T = { admin: jwt(ADMIN, 'aal2'), adminStaleCode: jwt(ADMIN, 'aal2', 3600), adminNoTwoStep: jwt(ADMIN, 'aal1'), user: jwt(USER, 'aal1'), suspended: jwt(SUSPENDED, 'aal1') };
const TOKENS: Record<string, { id: string; role: string; status: string }> = {
    [T.admin]: { id: ADMIN, role: 'admin', status: 'active' },
    [T.adminNoTwoStep]: { id: ADMIN, role: 'admin', status: 'active' },
    [T.adminStaleCode]: { id: ADMIN, role: 'admin', status: 'active' },
    [T.user]: { id: USER, role: 'user', status: 'active' },
    [T.suspended]: { id: SUSPENDED, role: 'user', status: 'suspended' },
};

/* ── stand-in Supabase: just enough of the auth and REST API, and a log of what was asked ── */
const calls: { method: string; url: string; auth: string; body: any }[] = [];
/** Rows the stand-in returns for the stored event log (empty unless a test fills it). */
let storedEvents: any[] = [];
/** Switches for single tests: the profile lookup failing; the role of the account being changed. */
let profilesDown = false;
let targetRole: string | null = null;
/** Stand-in live bus feed: counts how often it is asked, and moves the bus each time. */
let feedHits = 0;
const fake = http.createServer((req, res) => {
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', () => {
        const url = req.url ?? '', auth = (req.headers.authorization ?? '').replace('Bearer ', '');
        let body: any = null; try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
        calls.push({ method: req.method ?? '', url, auth, body });
        const send = (code: number, data: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
        const single = (req.headers.accept ?? '').includes('vnd.pgrst.object');

        if (url.startsWith('/feed')) {
            feedHits++;
            return send(200, [{ properties: { b: 'bus-1', dir: 0, speed: 10, r: '7', line: 'x' }, geometry: { coordinates: [-104.6, 50.4 + feedHits / 1000] } }]);
        }
        if (url.startsWith('/auth/v1/user')) {
            const u = TOKENS[auth];
            return u ? send(200, { id: u.id, aud: 'authenticated', role: 'authenticated', email: `${u.role}@example.com` }) : send(401, { msg: 'invalid token' });
        }
        if (url.startsWith('/auth/v1/admin/users/')) return send(200, { id: url.split('/').pop() });
        if (url.startsWith('/auth/v1/token')) {
            return body?.email === 'rider@example.com' && body?.password === 'correct-password'
                ? send(200, { access_token: T.user, refresh_token: 'refresh-token', token_type: 'bearer', expires_in: 3600, user: { id: USER, aud: 'authenticated', email: body.email } })
                : send(400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
        }
        if (url.startsWith('/rest/v1/profiles') && req.method === 'GET' && profilesDown) return send(500, { message: 'database unavailable' });
        if (url.startsWith('/rest/v1/profiles') && req.method === 'GET' && targetRole && url.includes(OTHER) && url.includes('select=role') && !url.includes('account_status')) return send(200, [{ role: targetRole }]);
        if (url.startsWith('/rest/v1/profiles') && req.method === 'GET' && single) {
            const id = /id=eq\.([0-9a-f-]+)/.exec(url)?.[1];
            const u = Object.values(TOKENS).find(t => t.id === id);
            return u ? send(200, { role: u.role, account_status: u.status }) : send(406, { message: 'no rows' });
        }
        if (url.startsWith('/rest/v1/profiles') && req.method === 'GET' && url.includes('id=in.')) {
            const known = new Map(Object.values(TOKENS).map(t => [t.id, { id: t.id, full_name: null, email: `${t.role}-${t.id.slice(0, 4)}@example.com` }]));
            return send(200, [...known.values()].filter(k => url.includes(k.id)));
        }
        if (url.startsWith('/rest/v1/security_events') && req.method === 'GET') return send(200, storedEvents);
        if (url.startsWith('/rest/v1/rpc/get_email_by_mobile')) return send(200, body?.mobile === '+1 306-555-0199' ? 'rider@example.com' : null);
        if (req.method === 'GET' || req.method === 'HEAD') return single ? send(406, { message: 'no rows' }) : send(200, []);
        return send(req.method === 'POST' ? 201 : 200, []);
    });
});

let base = '';
let server: http.Server;
let events: typeof import('../src/models/services/SecurityEventService').SecurityEventService;
const mails: { subject: string; text: string }[] = [];
let nextIp = 10;
/** Each test talks from its own address so rate limits and burst counters don't leak between tests. */
const freshIp = () => `10.0.${Math.floor(nextIp / 250)}.${nextIp++ % 250}`;

async function api(method: string, p: string, opts: { token?: string; body?: unknown; ip?: string; headers?: Record<string, string>; raw?: string } = {}) {
    const res = await fetch(base + p, {
        method,
        headers: {
            ...(opts.raw === undefined ? { 'Content-Type': 'application/json' } : {}),
            'X-Forwarded-For': opts.ip ?? freshIp(),
            ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
            ...opts.headers,
        },
        body: opts.raw ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });
    const text = await res.text();
    let json: any = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json, text, headers: res.headers };
}
/** Calls made with the backend's own key, other than writing the security event log itself. */
const backendWrites = () => calls.filter(c => c.auth === 'service-key' && c.method !== 'GET' && !c.url.startsWith('/rest/v1/security_events'));
const settle = () => new Promise(r => setTimeout(r, 30));   // events are recorded without blocking the response

before(async () => {
    await new Promise<void>(r => fake.listen(0, '127.0.0.1', r));
    process.env.VITE_SUPABASE_URL = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    process.env.TRANSIT_LIVE_API_URL = `http://127.0.0.1:${(fake.address() as AddressInfo).port}/feed`;
    process.env.TWILIO_AUTH_TOKEN = 'twilio-test-token';
    process.env.BACKEND_URL = 'https://api.example.test';
    process.env.ROUTE_OVERRIDES_FILE = path.join(os.tmpdir(), `route-overrides-test-${process.pid}.json`);
    // imported only now, so the modules read the settings above
    const { createApp } = await import('../src/apiApp');
    events = (await import('../src/models/services/SecurityEventService')).SecurityEventService;
    events._setMailer(async (subject, text) => { mails.push({ subject, text }); });
    server = createApp().listen(0, '127.0.0.1');
    await new Promise<void>(r => server.once('listening', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => { server.close(); fake.close(); });
beforeEach(() => { calls.length = 0; mails.length = 0; events._reset(); });

/* ── who may call what ── */

const ADMIN_ONLY: [string, string, unknown?][] = [
    ['DELETE', `/api/admin/users/${OTHER}`],
    ['PATCH', `/api/admin/users/${OTHER}`, { role: 'admin' }],
    ['POST', '/api/admin/fac/set', { userId: OTHER, feature: 'weekly_planner', enabled: false }],
    ['DELETE', `/api/admin/fac/reset/${OTHER}`],
    ['POST', '/api/admin/fac/set-all', { feature: 'weekly_planner', enabled: true }],
    ['GET', '/api/admin/security'],
    ['GET', '/api/admin/overview'],
    ['GET', '/api/admin/activity'],
    ['GET', `/api/admin/users/${OTHER}`],
    ['POST', '/api/admin/reveal', { what: 'visitor addresses' }],
    ['POST', '/api/admin/security/handled', { ids: [1] }],
    ['GET', '/api/admin/routes'],
    ['PATCH', '/api/admin/routes/4', { hidden: true }],
    ['GET', '/api/analytics/visitors'],
    ['GET', '/api/analytics/summary'],
    ['GET', '/api/features/weekly'],
    ['GET', '/api/features/daily'],
    ['GET', '/api/features/total'],
    ['POST', '/api/sms/broadcast', { routeNum: '4', message: 'hello' }],
];

test('admin endpoints refuse a caller with no login', async () => {
    for (const [method, p, body] of ADMIN_ONLY) {
        const r = await api(method, p, { body });
        assert.equal(r.status, 401, `${method} ${p}`);
    }
    assert.equal(backendWrites().length, 0, 'nothing but the event log may reach the database with backend rights');
});

test('admin endpoints refuse a signed-in non-admin, and record the attempt', async () => {
    for (const [method, p, body] of ADMIN_ONLY) {
        const r = await api(method, p, { body, token: T.user });
        assert.equal(r.status, 403, `${method} ${p}`);
    }
    await settle();
    assert.ok(events.recent().some(e => e.type === 'admin_denied' && e.userId === USER));
    assert.equal(calls.filter(c => c.url.includes('/auth/v1/admin/')).length, 0);
});

test('an admin who has not passed two-step sign-in cannot use admin endpoints', async () => {
    for (const [method, p, body] of ADMIN_ONLY) {
        const r = await api(method, p, { body, token: T.adminNoTwoStep });
        assert.equal(r.status, 403, `${method} ${p}`);
        assert.equal(r.json.code, 'two_step_required');
    }
    await settle();
    assert.ok(events.recent().some(e => e.type === 'admin_two_step_missing' && e.userId === ADMIN));
    assert.equal(backendWrites().length, 0);
    assert.equal(calls.filter(c => c.url.includes('/auth/v1/admin/')).length, 0);
});

test('a password-only admin login still works for ordinary signed-in features', async () => {
    assert.equal((await api('POST', '/api/sms/opt-out', { token: T.adminNoTwoStep })).status, 200);
});

test('a forged or expired token is refused', async () => {
    assert.equal((await api('GET', '/api/admin/security', { token: 'made-up' })).status, 401);
});

test('a suspended account is refused even with a valid token', async () => {
    assert.equal((await api('POST', '/api/sms/opt-out', { token: T.suspended })).status, 401);
});

test('an admin can use the admin endpoints', async () => {
    assert.equal((await api('GET', '/api/admin/security', { token: T.admin })).status, 200);
    assert.equal((await api('GET', '/api/analytics/visitors', { token: T.admin })).status, 200);
    assert.equal((await api('GET', '/api/admin/routes', { token: T.admin })).status, 200);
});

/* ── admin actions ── */

test('deleting a user works for an admin, is audited, and emails the admins', async () => {
    const r = await api('DELETE', `/api/admin/users/${OTHER}`, { token: T.admin });
    assert.equal(r.status, 200);
    assert.ok(calls.some(c => c.method === 'DELETE' && c.url === `/auth/v1/admin/users/${OTHER}` && c.auth === 'service-key'));
    assert.ok(events.recent().some(e => e.type === 'user_deleted' && e.severity === 'critical' && e.userId === ADMIN));
    assert.equal(mails.length, 1);
    assert.match(mails[0].subject, /CRITICAL/);
});

test('an admin cannot delete, demote or suspend their own account', async () => {
    assert.equal((await api('DELETE', `/api/admin/users/${ADMIN}`, { token: T.admin })).status, 400);
    assert.equal((await api('PATCH', `/api/admin/users/${ADMIN}`, { token: T.admin, body: { role: 'user' } })).status, 400);
    assert.equal((await api('PATCH', `/api/admin/users/${ADMIN}`, { token: T.admin, body: { account_status: 'suspended' } })).status, 400);
});

test('suspending a user also blocks them at the auth server', async () => {
    const r = await api('PATCH', `/api/admin/users/${OTHER}`, { token: T.admin, body: { account_status: 'suspended' } });
    assert.equal(r.status, 200);
    const ban = calls.find(c => c.method === 'PUT' && c.url === `/auth/v1/admin/users/${OTHER}`);
    assert.ok(ban && ban.body.ban_duration !== 'none');
});

test('changing a role is recorded as critical', async () => {
    assert.equal((await api('PATCH', `/api/admin/users/${OTHER}`, { token: T.admin, body: { role: 'admin' } })).status, 200);
    assert.ok(events.recent().some(e => e.type === 'role_changed' && e.severity === 'critical'));
});

test('feature changes record the real admin, not an id sent in the request', async () => {
    const r = await api('POST', '/api/admin/fac/set', { token: T.admin, body: { userId: OTHER, feature: 'weekly_planner', enabled: false, adminId: USER } });
    assert.equal(r.status, 200);
    const write = calls.find(c => c.method === 'POST' && c.url.startsWith('/rest/v1/feature_access'));
    assert.equal(write?.body.updated_by, ADMIN);
});

test('bad input to admin endpoints is rejected before reaching the database', async () => {
    const bad: [string, string, unknown?][] = [
        ['DELETE', '/api/admin/users/not-a-uuid'],
        ['PATCH', `/api/admin/users/${OTHER}`, { role: 'superuser' }],
        ['PATCH', `/api/admin/users/${OTHER}`, { account_status: 'banned' }],
        ['POST', '/api/admin/fac/set', { userId: OTHER, feature: 'x; drop table', enabled: true }],
        ['POST', '/api/admin/fac/set', { userId: OTHER, feature: 'weekly_planner', enabled: 'yes' }],
        ['POST', '/api/admin/fac/set-all', { feature: 'weekly_planner', enabled: false, userIds: ['nope'] }],
        ['PATCH', '/api/admin/routes/4', { hidden: 'true' }],
        ['PATCH', '/api/admin/routes/4', { route_name: 'x'.repeat(200) }],
        ['PATCH', '/api/admin/routes/..%2F..%2Fetc', { hidden: true }],
    ];
    for (const [method, p, body] of bad) {
        calls.length = 0;
        const r = await api(method, p, { body, token: T.admin });
        assert.equal(r.status, 400, `${method} ${p} ${JSON.stringify(body)}`);
        assert.equal(backendWrites().length, 0);
    }
});

test('deleting a user or granting admin needs a freshly entered authenticator code', async () => {
    const del = await api('DELETE', `/api/admin/users/${OTHER}`, { token: T.adminStaleCode });
    assert.equal(del.status, 403);
    assert.equal(del.json.code, 'fresh_two_step_required');
    const grant = await api('PATCH', `/api/admin/users/${OTHER}`, { token: T.adminStaleCode, body: { role: 'admin' } });
    assert.equal(grant.json.code, 'fresh_two_step_required');
    assert.equal(calls.filter(c => c.url.includes('/auth/v1/admin/')).length, 0);
    // routine admin work is not interrupted by an older code
    assert.equal((await api('GET', '/api/admin/activity', { token: T.adminStaleCode })).status, 200);
    assert.equal((await api('PATCH', `/api/admin/users/${OTHER}`, { token: T.adminStaleCode, body: { account_status: 'suspended' } })).status, 200);
});

test('a reason given for an action is kept in the log', async () => {
    await api('PATCH', `/api/admin/users/${OTHER}`, { token: T.admin, body: { account_status: 'suspended', reason: 'Abusive reports' } });
    assert.ok(events.recent().some(e => e.type === 'status_changed' && /Reason: Abusive reports/.test(e.message)));
});

test('marking events as handled updates only those events, keeps them, and is recorded', async () => {
    assert.equal((await api('POST', '/api/admin/security/handled', { token: T.admin, body: { ids: [7, 9] } })).status, 200);
    const write = calls.find(c => c.method === 'PATCH' && c.url.startsWith('/rest/v1/security_events'));
    assert.ok(write && /id=in\.(%28|\()7(%2C|,)9/.test(write.url), 'only the chosen events');
    assert.equal(write.body.handled_by, ADMIN);
    assert.ok(write.body.handled_at);
    assert.equal(calls.filter(c => c.method === 'DELETE').length, 0, 'events are never deleted');
    assert.ok(events.recent().some(e => e.type === 'events_handled' && e.userId === ADMIN));
    for (const ids of [[], ['1'], [0], [1.5], 'all', Array(501).fill(1)])
        assert.equal((await api('POST', '/api/admin/security/handled', { token: T.admin, body: { ids } })).status, 400, JSON.stringify(ids).slice(0, 20));
});

test('events name people by email, never by account id', async () => {
    const row = (message: string, user_id: string | null) => ({ id: 1, handled_at: null, type: 'role_changed', severity: 'critical', message, user_id, ip: null, path: null, created_at: new Date().toISOString() });
    storedEvents = [
        row(`Admin set user ${USER} to role "admin".`, ADMIN),
        row(`Admin deleted user ${OTHER} (gone@example.com). Reason: spam`, ADMIN),
        row(`Admin deleted user ${OTHER}.`, null),
    ];
    try {
        const { json } = await api('GET', '/api/admin/security', { token: T.admin });
        assert.equal(json.events[0].message, 'Admin set user user-2222@example.com to role "admin".');
        assert.equal(json.events[0].who, 'admin-1111@example.com');
        assert.equal(json.events[1].message, 'Admin deleted user gone@example.com. Reason: spam', 'a deleted account keeps the email noted at deletion');
        assert.equal(json.events[2].message, 'Admin deleted user (deleted account).');
        assert.equal(json.events[2].who, null);
        assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-/.test(JSON.stringify(json.events)), 'no account ids are sent to the page');
        const activity = await api('GET', '/api/admin/activity', { token: T.admin });
        assert.equal(activity.json[0].admin, 'admin-1111@example.com');
    } finally { storedEvents = []; }
});

test('revealing hidden personal data is recorded against the admin', async () => {
    assert.equal((await api('POST', '/api/admin/reveal', { token: T.admin, body: { what: 'visitor addresses' } })).status, 200);
    assert.ok(events.recent().some(e => e.type === 'personal_data_viewed' && e.userId === ADMIN));
});

test('the overview reports live numbers, a seven-day trend and anything needing attention', async () => {
    const r = await api('GET', '/api/admin/overview', { token: T.admin });
    assert.equal(r.status, 200);
    assert.equal(r.json.trend.length, 7);
    for (const k of ['live', 'today', 'totals', 'attention', 'recent']) assert.ok(k in r.json, k);
});

/* ── public endpoints ── */

test('public transit data needs no login', async () => {
    for (const p of ['/api/routes', '/api/stops', '/api/colors', '/api/status']) assert.equal((await api('GET', p)).status, 200, p);
});

test('stop numbers are validated', async () => {
    assert.equal((await api('GET', '/api/stop-predictions/abc')).status, 400);
    assert.equal((await api('GET', '/api/stop-predictions/0251%26x%3D1')).status, 400);
});

test('the visitor beacon ignores a user id sent in the body', async () => {
    const r = await api('POST', '/api/analytics/beacon', { body: { page: '/map', userId: OTHER } });
    assert.equal(r.status, 200);
    const write = calls.find(c => c.method === 'POST' && c.url.startsWith('/rest/v1/visitor_sessions'));
    assert.ok(write, 'a session is stored');
    assert.equal(write.body.user_id, undefined);
});

test('the visitor beacon links the user from their login token', async () => {
    await api('POST', '/api/analytics/beacon', { body: { page: '/map' }, token: T.user });
    const write = calls.find(c => c.method === 'POST' && c.url.startsWith('/rest/v1/visitor_sessions'));
    assert.equal(write?.body.user_id, USER);
});

test('a page value that is not a path is not stored', async () => {
    await api('POST', '/api/analytics/beacon', { body: { page: '<script>alert(1)</script>' } });
    const write = calls.find(c => c.method === 'POST' && c.url.startsWith('/rest/v1/visitor_sessions'));
    assert.deepEqual(write?.body.pages_visited, ['/']);
});

test('push subscriptions need a login and are stored for the token owner only', async () => {
    const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', p256dh: 'key', auth: 'secret', userId: OTHER };
    assert.equal((await api('POST', '/api/push/subscribe', { body: sub })).status, 401);
    assert.equal((await api('POST', '/api/push/subscribe', { body: sub, token: T.user })).status, 200);
    const write = calls.find(c => c.method === 'POST' && c.url.startsWith('/rest/v1/push_subscriptions'));
    assert.equal(write?.body.user_id, USER);
    assert.equal(write?.auth, T.user, 'written as the user, so row-level security applies');
    assert.equal((await api('POST', '/api/push/subscribe', { body: { ...sub, endpoint: 'javascript:alert(1)' }, token: T.user })).status, 400);
});

test('the text-message webhook refuses calls without a valid Twilio signature', async () => {
    const r = await api('POST', '/api/sms/webhook', { raw: 'From=%2B13065550199&Body=START', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    assert.equal(r.status, 403);
    assert.equal(calls.filter(c => c.url.startsWith('/rest/v1/profiles') && c.method === 'PATCH').length, 0);
    await settle();
    assert.ok(events.recent().some(e => e.type === 'webhook_rejected'));
});

test('the text-message webhook accepts a correctly signed call', async () => {
    const twilio = (await import('twilio')).default;
    const params = { From: '+13065550199', Body: 'STOP' };
    const signature = twilio.getExpectedTwilioSignature('twilio-test-token', 'https://api.example.test/api/sms/webhook', params);
    const r = await api('POST', '/api/sms/webhook', { raw: new URLSearchParams(params).toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': signature } });
    assert.equal(r.status, 200);
    assert.ok(calls.some(c => c.url.startsWith('/rest/v1/profiles') && c.method === 'PATCH' && c.body.sms_opted_in === false));
});

/* ── rate limits ── */

test('phone sign-in is done by the backend and never reveals the email', async () => {
    const ok = await api('POST', '/api/auth/login-mobile', { body: { mobile: '+1 306-555-0199', password: 'correct-password' } });
    assert.equal(ok.status, 200);
    assert.deepEqual(Object.keys(ok.json).sort(), ['access_token', 'refresh_token']);
    assert.ok(!JSON.stringify(ok.json).includes('rider@example.com'));
    // wrong password, unknown number and nonsense all get the same answer
    const answers = [
        await api('POST', '/api/auth/login-mobile', { body: { mobile: '+1 306-555-0199', password: 'wrong' } }),
        await api('POST', '/api/auth/login-mobile', { body: { mobile: '+1 306-555-0100', password: 'correct-password' } }),
        await api('POST', '/api/auth/login-mobile', { body: { mobile: "+1' OR 1=1 --", password: 'x' } }),
        await api('POST', '/api/auth/login-mobile', { body: {} }),
    ];
    for (const r of answers) { assert.equal(r.status, 401); assert.deepEqual(r.json, { error: 'Invalid credentials' }); }
    assert.equal((await api('POST', '/api/auth/resolve-mobile', { body: { mobile: '+1 306-555-0199' } })).status, 404, 'the old lookup is gone');
});

test('phone sign-in is limited to a few tries a minute per address', async () => {
    const ip = freshIp();
    for (let i = 0; i < 5; i++) await api('POST', '/api/auth/login-mobile', { ip, body: { mobile: '+1 306-555-0199', password: 'wrong' } });
    const sixth = await api('POST', '/api/auth/login-mobile', { ip, body: { mobile: '+1 306-555-0199', password: 'correct-password' } });
    assert.equal(sixth.status, 429);
    assert.ok(sixth.headers.get('retry-after'));
    assert.equal((await api('POST', '/api/auth/login-mobile', { body: { mobile: '+1 306-555-0199', password: 'correct-password' } })).status, 200, 'another address is unaffected');
    await settle();
    assert.equal(events.recent().filter(e => e.type === 'rate_limited' && e.ip === ip).length, 1, 'one event per window, not one per request');
});

/* ── findings from the October 2026 audit ── */

test('the visitor is identified by their own address, not the proxy in front of the backend', async () => {
    const seen = async (chain: string) => (await api('POST', '/api/analytics/beacon', { ip: chain, body: { page: '/' } })).json.sessionId.split('::')[0];
    assert.equal(await seen('203.0.113.7, 152.233.40.1'), '203.0.113.7', 'visitor, then Railway');
    assert.equal(await seen('6.6.6.6, 203.0.113.8, 152.233.40.1'), '203.0.113.8', 'an address the caller invented in front is ignored');
    assert.equal(await seen('203.0.113.9'), '203.0.113.9');
});

test('two visitors behind the same proxy have separate rate limits', async () => {
    for (let i = 0; i < 6; i++) await api('POST', '/api/auth/login-mobile', { ip: '203.0.113.20, 152.233.40.1', body: {} });
    assert.equal((await api('POST', '/api/auth/login-mobile', { ip: '203.0.113.20, 152.233.40.1', body: {} })).status, 429);
    assert.equal((await api('POST', '/api/auth/login-mobile', { ip: '203.0.113.21, 152.233.40.1', body: {} })).status, 401);
});

test('a stream of requests without a login cannot flood the event log', async () => {
    const ip = freshIp();
    calls.length = 0;
    for (let i = 0; i < 40; i++) await api('GET', `/api/admin/overview?n=${i}`, { ip });
    await settle();
    const stored = calls.filter(c => c.method === 'POST' && c.url.startsWith('/rest/v1/security_events')).map(c => c.body.type);
    assert.deepEqual(stored.sort(), ['auth_failed', 'burst'], 'one row for the kind of event, one for the alert');
    assert.equal(mails.length, 1, 'the repeated-probing alert still fires');
});

test('changing the browser name does not create extra visitor records', async () => {
    const ip = freshIp();
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) ids.add((await api('POST', '/api/analytics/beacon', { ip, headers: { 'User-Agent': `Made-up/${i}` }, body: { page: '/' } })).json.sessionId);
    assert.equal(ids.size, 1);
});

test('push notifications can only be registered for real push services', async () => {
    const keys = { p256dh: 'k', auth: 'a' };
    for (const endpoint of ['https://127.0.0.1:8443/x', 'https://10.0.0.5/admin', 'https://backend.railway.internal/', 'https://victim.example/receive', 'http://fcm.googleapis.com/x', 'https://fcm.googleapis.com.evil.example/x', 'https://fcm.googleapis.com:8443/x'])
        assert.equal((await api('POST', '/api/push/subscribe', { token: T.user, body: { endpoint, ...keys } })).status, 400, endpoint);
    for (const endpoint of ['https://fcm.googleapis.com/fcm/send/abc', 'https://updates.push.services.mozilla.com/wpush/v2/abc', 'https://web.push.apple.com/abc', 'https://wns2-by3p.notify.windows.com/w/?token=abc'])
        assert.equal((await api('POST', '/api/push/subscribe', { token: T.user, body: { endpoint, ...keys } })).status, 200, endpoint);
});

test('if an account\'s status cannot be read, the request is refused rather than allowed', async () => {
    profilesDown = true;
    try {
        const r = await api('POST', '/api/sms/opt-out', { token: T.suspended });
        assert.equal(r.status, 503);
        assert.equal((await api('GET', '/api/admin/overview', { token: T.admin })).status, 503);
    } finally { profilesDown = false; }
});

test('demoting or suspending another admin needs a freshly entered code', async () => {
    targetRole = 'admin';
    try {
        for (const body of [{ role: 'user' }, { account_status: 'suspended' }]) {
            const r = await api('PATCH', `/api/admin/users/${OTHER}`, { token: T.adminStaleCode, body });
            assert.equal(r.json.code, 'fresh_two_step_required', JSON.stringify(body));
        }
        assert.equal((await api('PATCH', `/api/admin/users/${OTHER}`, { token: T.admin, body: { role: 'user' } })).status, 200);
    } finally { targetRole = null; }
});

test('the live bus feed is fetched once and shared, and is never more than half a second old', async () => {
    await new Promise(r => setTimeout(r, 600));   // let any earlier copy expire
    feedHits = 0;
    const answers = await Promise.all(Array.from({ length: 30 }, () => api('GET', '/api/live')));
    assert.equal(feedHits, 1, '30 riders asking at once cause one request to the feed');
    assert.ok(answers.every(a => a.status === 200 && a.json.length === 1 && a.json[0].bus_id === 'bus-1'));
    const first = answers[0].json[0].lat;
    for (let i = 0; i < 5; i++) await api('GET', '/api/live');
    assert.equal(feedHits, 1, 'asks inside the same half second share the copy');
    await new Promise(r => setTimeout(r, 600));
    const later = await api('GET', '/api/live');
    assert.equal(feedHits, 2, 'after half a second the feed is asked again');
    assert.notEqual(later.json[0].lat, first, 'and the bus has moved: riders never keep seeing an old position');
});

test('usage tracking with no body is a bad request, not a server error', async () => {
    const r = await fetch(base + '/api/features/track', { method: 'POST', headers: { 'X-Forwarded-For': freshIp() } });
    assert.equal(r.status, 400);
});

test('analytics tracking is rate limited', async () => {
    const ip = freshIp(); let last = 200;
    for (let i = 0; i < 125; i++) last = (await api('POST', '/api/features/track', { ip, body: { type: 'places' } })).status;
    assert.equal(last, 429);
});

/* ── transport and errors ── */

test('responses carry security headers and do not advertise Express', async () => {
    const r = await api('GET', '/api/status');
    assert.equal(r.headers.get('x-powered-by'), null);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    assert.match(r.headers.get('strict-transport-security') ?? '', /max-age=\d+/);
    assert.match(r.headers.get('content-security-policy') ?? '', /default-src 'none'/);
});

test('a website that is not on the allow list is refused', async () => {
    const r = await api('GET', '/api/status', { headers: { Origin: 'https://evil.example' } });
    assert.equal(r.status, 403);
    assert.equal(r.headers.get('access-control-allow-origin'), null);
    const ok = await api('GET', '/api/status', { headers: { Origin: 'https://transitregina.ca' } });
    assert.equal(ok.headers.get('access-control-allow-origin'), 'https://transitregina.ca');
});

test('oversized and malformed bodies are refused without leaking details', async () => {
    const big = await api('POST', '/api/features/track', { raw: JSON.stringify({ type: 'x'.repeat(50_000) }), headers: { 'Content-Type': 'application/json' } });
    assert.equal(big.status, 413);
    const broken = await api('POST', '/api/features/track', { raw: '{"type":', headers: { 'Content-Type': 'application/json' } });
    assert.equal(broken.status, 400);
    assert.doesNotMatch(broken.text, /SyntaxError|at JSON|node_modules/);
});

test('unknown paths answer 404 as JSON', async () => {
    const r = await api('GET', '/api/does-not-exist');
    assert.equal(r.status, 404);
    assert.deepEqual(r.json, { error: 'Not found' });
});

/* ── days are counted in Regina time, not the server's ── */

test('a Sunday-evening search in Regina is counted on Sunday, not Monday', async () => {
    const { reginaWeekday, reginaDateKey, startOfReginaDay, startOfReginaWeek } = await import('../src/models/services/ReginaTime');
    // 9 p.m. Sunday 11 Oct 2026 in Regina is 3 a.m. Monday in UTC — the bug counted it as Monday
    const sundayEvening = '2026-10-12T03:00:00Z';
    assert.equal(reginaWeekday(sundayEvening), 'Sun');
    assert.equal(reginaDateKey(sundayEvening), '2026-10-11');
    assert.equal(reginaWeekday('2026-10-12T06:00:00Z'), 'Mon', 'midnight in Regina starts Monday');
    assert.equal(reginaWeekday('2026-10-12T05:59:59Z'), 'Sun');
    // day and week boundaries
    const now = Date.parse(sundayEvening);
    assert.equal(startOfReginaDay(0, now).toISOString(), '2026-10-11T06:00:00.000Z');
    assert.equal(startOfReginaDay(-1, now).toISOString(), '2026-10-10T06:00:00.000Z');
    assert.equal(startOfReginaWeek(now).toISOString(), '2026-10-05T06:00:00.000Z', 'the week began the previous Monday');
    assert.equal(startOfReginaWeek(Date.parse('2026-10-12T06:00:00Z')).toISOString(), '2026-10-12T06:00:00.000Z');
});

/* ── alerting ── */

test('repeated probing from one address is escalated and emailed once', async () => {
    const ip = freshIp();
    for (let i = 0; i < 12; i++) await api('GET', '/api/admin/security', { ip });
    await settle();
    const burst = events.recent().filter(e => e.type === 'burst');
    assert.equal(burst.length, 1);
    assert.equal(burst[0].severity, 'critical');
    assert.equal(mails.length, 1);
});

test('alert emails are throttled so an attack cannot flood the inbox', async () => {
    for (let i = 0; i < 5; i++) await events.record({ type: 'dependency_down', severity: 'critical', message: 'Database is not working' });
    assert.equal(mails.length, 1);
    await events.record({ type: 'user_deleted', severity: 'critical', message: 'another kind still gets through' });
    assert.equal(mails.length, 2);
});

test('the security page lists recent events and system health for admins', async () => {
    await events.record({ type: 'admin_denied', severity: 'warning', message: 'test event', ip: '10.9.9.9' });
    const r = await api('GET', '/api/admin/security', { token: T.admin });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json.events));
    assert.ok(Array.isArray(r.json.health.checks) && Array.isArray(r.json.health.config));
});

test('a dependency going down alerts after two failed checks and reports recovery', async () => {
    const { HealthService } = await import('../src/models/services/HealthService');
    HealthService._reset();
    delete process.env.TRANSIT_LIVE_API_URL;                       // the bus feed check now fails
    await HealthService.run();
    assert.equal(events.recent().filter(e => e.type === 'dependency_down').length, 0, 'one blip is not an outage');
    await HealthService.run();
    assert.equal(events.recent().filter(e => e.type === 'dependency_down').length, 1);
    await HealthService.run();
    assert.equal(events.recent().filter(e => e.type === 'dependency_down').length, 1, 'no repeat alerts while it stays down');
    assert.ok(HealthService.report().checks.some(c => c.name === 'Live bus feed' && !c.ok));
    process.env.TRANSIT_LIVE_API_URL = `${base}/api/routes`;         // any URL answering 200 with a JSON list
    await HealthService.run();
    assert.ok(events.recent().some(e => e.type === 'dependency_recovered'));
});
