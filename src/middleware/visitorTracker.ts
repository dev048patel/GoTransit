/*
  Visitor Session Store
  Tracks unique visitors using a beacon + heartbeat model.
  
  - Frontend sends POST /beacon once on page load → creates a session
  - Frontend sends POST /heartbeat every 60s → keeps session alive
  - Session expires after 30 min of no heartbeat → visitor is "inactive"
  
  One person on one device = 1 session (no inflation from API polling).
  Same person on different device = 2 sessions.
*/

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
    sessionId: string;         // Unique fingerprint (IP + UA)
    ip: string;
    browser: string;
    os: string;
    device: string;
    firstSeen: string;         // When they first opened the site
    lastSeen: string;          // Last heartbeat received
    status: 'active' | 'inactive';
    pagesVisited: string[];    // Pages they navigated to
    pageViews: number;         // Total navigation events
}

// ─── Storage ───────────────────────────────────────
const sessions = new Map<string, VisitorSession>();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function createFingerprint(ip: string, userAgent: string): string {
    return `${ip}::${userAgent}`;
}

// ─── Public API ────────────────────────────────────

/*
  Called when the frontend sends a beacon (page load).
  Creates a new session or reactivates an existing one.
*/
export function registerSession(ip: string, userAgent: string, page?: string): string {
    const sessionId = createFingerprint(ip, userAgent);
    const { browser, os, device } = parseUserAgent(userAgent);
    const now = new Date().toISOString();

    const existing = sessions.get(sessionId);
    if (existing) {
        // User returned — reactivate session
        existing.lastSeen = now;
        existing.status = 'active';
        existing.pageViews += 1;
        if (page && !existing.pagesVisited.includes(page)) {
            existing.pagesVisited.push(page);
        }
    } else {
        // Brand new visitor
        sessions.set(sessionId, {
            sessionId,
            ip,
            browser,
            os,
            device,
            firstSeen: now,
            lastSeen: now,
            status: 'active',
            pagesVisited: page ? [page] : ['/'],
            pageViews: 1,
        });
    }

    return sessionId;
}

/*
  Called every 60s by the frontend heartbeat.
  Keeps the session alive and optionally updates the current page.
*/
export function heartbeat(ip: string, userAgent: string, page?: string): boolean {
    const sessionId = createFingerprint(ip, userAgent);
    const session = sessions.get(sessionId);

    if (!session) {
        // Session doesn't exist yet — create it via beacon
        registerSession(ip, userAgent, page);
        return true;
    }

    session.lastSeen = new Date().toISOString();
    session.status = 'active';
    if (page && !session.pagesVisited.includes(page)) {
        session.pagesVisited.push(page);
    }

    return true;
}

/*
  Marks sessions as inactive if no heartbeat received in 30 minutes.
*/
function expireStaleSessions(): void {
    const now = Date.now();
    sessions.forEach((session) => {
        if (now - new Date(session.lastSeen).getTime() > SESSION_TIMEOUT_MS) {
            session.status = 'inactive';
        }
    });
}

/*
  Returns visitor sessions, optionally filtered by date range.
  Filters on firstSeen so you can find "who visited on Feb 12".
*/
export function getVisitorRecords(from?: string, to?: string): VisitorSession[] {
    expireStaleSessions();
    let results = Array.from(sessions.values());

    if (from) {
        const fromDate = new Date(from).getTime();
        results = results.filter(s => new Date(s.firstSeen).getTime() >= fromDate);
    }
    if (to) {
        // Add 1 day to 'to' so selecting "Feb 12" includes the whole day
        const toDate = new Date(to).getTime() + 24 * 60 * 60 * 1000;
        results = results.filter(s => new Date(s.firstSeen).getTime() < toDate);
    }

    return results.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
}

/*
  Returns aggregated analytics summary.
  When from/to are provided, all metrics are scoped to that window.
  Otherwise defaults to last 24 hours for breakdowns.
*/
export function getAnalyticsSummary(from?: string, to?: string) {
    expireStaleSessions();

    const allSessions = Array.from(sessions.values());

    // Filter sessions to date range (or default to all for the cards)
    let filtered: VisitorSession[];
    if (from || to) {
        filtered = allSessions.filter(s => {
            const t = new Date(s.firstSeen).getTime();
            if (from && t < new Date(from).getTime()) return false;
            if (to && t >= new Date(to).getTime() + 24 * 60 * 60 * 1000) return false;
            return true;
        });
    } else {
        // Default: last 24h for breakdowns
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        filtered = allSessions.filter(s => new Date(s.lastSeen) > oneDayAgo);
    }

    // Active = heartbeat within last 30 min (always real-time, not filtered)
    const activeSessions = allSessions.filter(s => s.status === 'active');

    // Browser breakdown
    const browsers: Record<string, number> = {};
    filtered.forEach(s => { browsers[s.browser] = (browsers[s.browser] || 0) + 1; });

    // OS breakdown
    const operatingSystems: Record<string, number> = {};
    filtered.forEach(s => { operatingSystems[s.os] = (operatingSystems[s.os] || 0) + 1; });

    // Device breakdown
    const devices: Record<string, number> = {};
    filtered.forEach(s => { devices[s.device] = (devices[s.device] || 0) + 1; });

    // Top pages
    const paths: Record<string, number> = {};
    filtered.forEach(s => {
        s.pagesVisited.forEach(p => { paths[p] = (paths[p] || 0) + 1; });
    });
    const topPages = Object.entries(paths)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, count]) => ({ path, count }));

    return {
        totalVisitors: allSessions.length,
        visitorsInRange: filtered.length,
        activeNow: activeSessions.length,
        totalPageViews: filtered.reduce((sum, s) => sum + s.pageViews, 0),
        browsers: Object.entries(browsers).map(([name, count]) => ({ name, count })),
        operatingSystems: Object.entries(operatingSystems).map(([name, count]) => ({ name, count })),
        devices: Object.entries(devices).map(([name, count]) => ({ name, count })),
        topPages,
    };
}
