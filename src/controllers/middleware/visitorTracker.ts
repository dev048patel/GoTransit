/*
  Visitor Session Store (Supabase-backed)
  Tracks unique visitors using a beacon + heartbeat model.

  - Frontend sends POST /beacon once on page load → creates a session
  - Frontend sends POST /heartbeat every 60s → keeps session alive
  - Session expires after 30 min of no heartbeat → visitor is "inactive"

  Data persists in the `visitor_sessions` Supabase table.
*/

import { supabaseServer } from '../../models/lib/supabaseServer';

// ─── UA Lookup Tables ──────────────────────────────
const BROWSER_CODES: [string, string][] = [
    ['Firefox/', 'Firefox'],
    ['Edg/', 'Edge'],
    ['OPR/', 'Opera'],
    ['Opera', 'Opera'],
    ['Chrome/', 'Chrome'],
    ['Safari/', 'Safari'],
    ['MSIE', 'Internet Explorer'],
    ['Trident/', 'Internet Explorer'],
];

const OS_CODES: [string, string][] = [
    ['iPhone', 'iOS (iPhone)'],
    ['iPad', 'iOS (iPad)'],
    ['Android', 'Android'],
    ['CrOS', 'Chrome OS'],
    ['Windows NT 10', 'Windows 10/11'],
    ['Windows NT', 'Windows'],
    ['Mac OS X', 'macOS'],
    ['Linux', 'Linux'],
];

const DEVICE_CODES: [string, string][] = [
    ['iPhone', 'Mobile'],
    ['Mobile', 'Mobile'],
    ['iPad', 'Tablet'],
    ['Tablet', 'Tablet'],
    ['Bot', 'Bot/Crawler'],
    ['bot', 'Bot/Crawler'],
    ['Crawler', 'Bot/Crawler'],
    ['Spider', 'Bot/Crawler'],
];


function parseUserAgent(ua: string): { browser: string; os: string; device: string } {
    const browser = BROWSER_CODES.find(([code]) => ua.includes(code))?.[1] ?? 'Unknown';
    const os = OS_CODES.find(([code]) => ua.includes(code))?.[1] ?? 'Unknown';
    const device = DEVICE_CODES.find(([code]) => ua.includes(code))?.[1] ?? 'Desktop';
    return { browser, os, device };
}

// ─── Session Types ─────────────────────────────────
export interface VisitorSession {
    sessionId: string;
    ip: string;
    browser: string;
    os: string;
    device: string;
    firstSeen: string;
    lastSeen: string;
    status: 'active' | 'inactive';
    pagesVisited: string[];
    pageViews: number;
}

// ─── Helpers ──────────────────────────────────────
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function createFingerprint(ip: string, userAgent: string): string {
    return `${ip}::${userAgent}`;
}

/** Map a DB row to the VisitorSession shape the frontend expects. */
function rowToSession(row: any): VisitorSession {
    return {
        sessionId: row.session_id,
        ip: row.ip,
        browser: row.browser,
        os: row.os,
        device: row.device,
        firstSeen: row.first_seen,
        lastSeen: row.last_seen,
        status: row.status,
        pagesVisited: row.pages_visited ?? [],
        pageViews: row.page_views,
    };
}

// ─── Public API ────────────────────────────────────

/*
  Called when the frontend sends a beacon (page load).
  Creates a new session or reactivates an existing one.
*/
export async function registerSession(ip: string, userAgent: string, page?: string): Promise<string> {
    const sessionId = createFingerprint(ip, userAgent);
    const { browser, os, device } = parseUserAgent(userAgent);
    const now = new Date().toISOString();

    // Check if session already exists
    const { data: existing } = await supabaseServer
        .from('visitor_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

    if (existing) {
        // User returned — reactivate session
        const pages: string[] = existing.pages_visited ?? [];
        if (page && !pages.includes(page)) pages.push(page);

        await supabaseServer
            .from('visitor_sessions')
            .update({
                last_seen: now,
                status: 'active',
                page_views: existing.page_views + 1,
                pages_visited: pages,
            })
            .eq('session_id', sessionId);
    } else {
        // Brand new visitor
        await supabaseServer
            .from('visitor_sessions')
            .insert({
                session_id: sessionId,
                ip,
                browser,
                os,
                device,
                first_seen: now,
                last_seen: now,
                status: 'active',
                pages_visited: page ? [page] : ['/'],
                page_views: 1,
            });
    }

    return sessionId;
}

/*
  Called every 60s by the frontend heartbeat.
  Keeps the session alive and optionally updates the current page.
*/
export async function heartbeat(ip: string, userAgent: string, page?: string): Promise<boolean> {
    const sessionId = createFingerprint(ip, userAgent);

    const { data: session } = await supabaseServer
        .from('visitor_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

    if (!session) {
        // Session doesn't exist yet — create it via beacon
        await registerSession(ip, userAgent, page);
        return true;
    }

    const pages: string[] = session.pages_visited ?? [];
    if (page && !pages.includes(page)) pages.push(page);

    await supabaseServer
        .from('visitor_sessions')
        .update({
            last_seen: new Date().toISOString(),
            status: 'active',
            pages_visited: pages,
        })
        .eq('session_id', sessionId);

    return true;
}

/*
  Marks sessions as inactive if no heartbeat received in 30 minutes.
*/
async function expireStaleSessions(): Promise<void> {
    const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString();

    await supabaseServer
        .from('visitor_sessions')
        .update({ status: 'inactive' })
        .eq('status', 'active')
        .lt('last_seen', cutoff);
}

/*
  Returns visitor sessions, optionally filtered by date range.
*/
export async function getVisitorRecords(from?: string, to?: string): Promise<VisitorSession[]> {
    await expireStaleSessions();

    let query = supabaseServer
        .from('visitor_sessions')
        .select('*')
        .order('last_seen', { ascending: false });

    if (from) {
        query = query.gte('first_seen', new Date(from).toISOString());
    }
    if (to) {
        // Add 1 day so selecting "Feb 12" includes the whole day
        const toDate = new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000).toISOString();
        query = query.lt('first_seen', toDate);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching visitor records:', error);
        return [];
    }

    return (data ?? []).map(rowToSession);
}

/*
  Returns aggregated analytics summary.
*/
export async function getAnalyticsSummary(from?: string, to?: string) {
    await expireStaleSessions();

    // Total visitors (all time)
    const { count: totalVisitors } = await supabaseServer
        .from('visitor_sessions')
        .select('*', { count: 'exact', head: true });

    // Active now
    const { count: activeNow } = await supabaseServer
        .from('visitor_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

    // Build filtered query for date range
    let filteredQuery = supabaseServer.from('visitor_sessions').select('*');

    if (from || to) {
        if (from) filteredQuery = filteredQuery.gte('first_seen', new Date(from).toISOString());
        if (to) {
            const toDate = new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000).toISOString();
            filteredQuery = filteredQuery.lt('first_seen', toDate);
        }
    } else {
        // Default: last 24h for breakdowns
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        filteredQuery = filteredQuery.gte('last_seen', oneDayAgo);
    }

    const { data: filtered } = await filteredQuery;
    const sessions = (filtered ?? []).map(rowToSession);

    // Browser breakdown
    const browsers: Record<string, number> = {};
    sessions.forEach(s => { browsers[s.browser] = (browsers[s.browser] || 0) + 1; });

    // OS breakdown
    const operatingSystems: Record<string, number> = {};
    sessions.forEach(s => { operatingSystems[s.os] = (operatingSystems[s.os] || 0) + 1; });

    // Device breakdown
    const devices: Record<string, number> = {};
    sessions.forEach(s => { devices[s.device] = (devices[s.device] || 0) + 1; });

    // Top pages
    const paths: Record<string, number> = {};
    sessions.forEach(s => {
        s.pagesVisited.forEach(p => { paths[p] = (paths[p] || 0) + 1; });
    });
    const topPages = Object.entries(paths)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, count]) => ({ path, count }));

    return {
        totalVisitors: totalVisitors ?? 0,
        visitorsInRange: sessions.length,
        activeNow: activeNow ?? 0,
        totalPageViews: sessions.reduce((sum, s) => sum + s.pageViews, 0),
        browsers: Object.entries(browsers).map(([name, count]) => ({ name, count })),
        operatingSystems: Object.entries(operatingSystems).map(([name, count]) => ({ name, count })),
        devices: Object.entries(devices).map(([name, count]) => ({ name, count })),
        topPages,
    };
}
