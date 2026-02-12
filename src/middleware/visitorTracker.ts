/*
  Visitor Tracking Middleware
  Logs every incoming request with:
  - IP address
  - User agent (browser, OS, device)
  - Requested path
  - Timestamp
  - HTTP method

  Data is stored in-memory (resets when server restarts).
  For production, this would be replaced with a database.
*/

import { Request, Response, NextFunction } from 'express';

export interface VisitorRecord {
    ip: string;
    userAgent: string;
    browser: string;
    os: string;
    device: string;
    path: string;
    method: string;
    timestamp: string;
    country?: string;
}

// In-memory store (persists until server restart)
const visitors: VisitorRecord[] = [];
const MAX_RECORDS = 1000; // Keep last 1000 visits to prevent memory issues

/*
  Parses the User-Agent string to extract browser, OS, and device type.
*/
/*
  Lookup tables for User-Agent parsing.
  Each entry: [pattern to match, label to assign].
  Order matters — first match wins (e.g., Edge before Chrome).
*/
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

/*
  Express middleware that logs each visitor request.
*/
export function visitorTracker(req: Request, res: Response, next: NextFunction): void {
    // Get the real IP (Railway/Vercel often set x-forwarded-for)
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.socket.remoteAddress || 'Unknown';

    const userAgent = req.headers['user-agent'] || 'Unknown';
    const { browser, os, device } = parseUserAgent(userAgent);

    const record: VisitorRecord = {
        ip,
        userAgent,
        browser,
        os,
        device,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
    };

    visitors.push(record);

    // Trim to prevent unbounded memory growth
    if (visitors.length > MAX_RECORDS) {
        visitors.splice(0, visitors.length - MAX_RECORDS);
    }

    next();
}

/*
  Returns all visitor records (newest first).
*/
export function getVisitorRecords(): VisitorRecord[] {
    return [...visitors].reverse();
}

/*
  Returns aggregated analytics summary.
*/
export function getAnalyticsSummary() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentVisitors = visitors.filter(v => new Date(v.timestamp) > oneDayAgo);
    const lastHourVisitors = visitors.filter(v => new Date(v.timestamp) > oneHourAgo);

    // Unique IPs
    const uniqueIPs = new Set(recentVisitors.map(v => v.ip));
    const uniqueIPsLastHour = new Set(lastHourVisitors.map(v => v.ip));

    // Browser breakdown
    const browsers: Record<string, number> = {};
    recentVisitors.forEach(v => {
        browsers[v.browser] = (browsers[v.browser] || 0) + 1;
    });

    // OS breakdown
    const operatingSystems: Record<string, number> = {};
    recentVisitors.forEach(v => {
        operatingSystems[v.os] = (operatingSystems[v.os] || 0) + 1;
    });

    // Device breakdown
    const devices: Record<string, number> = {};
    recentVisitors.forEach(v => {
        devices[v.device] = (devices[v.device] || 0) + 1;
    });

    // Most visited paths
    const paths: Record<string, number> = {};
    recentVisitors.forEach(v => {
        paths[v.path] = (paths[v.path] || 0) + 1;
    });

    // Top pages sorted by visits
    const topPages = Object.entries(paths)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, count]) => ({ path, count }));

    return {
        totalVisits24h: recentVisitors.length,
        uniqueVisitors24h: uniqueIPs.size,
        activeLastHour: uniqueIPsLastHour.size,
        totalVisitsAllTime: visitors.length,
        browsers: Object.entries(browsers).map(([name, count]) => ({ name, count })),
        operatingSystems: Object.entries(operatingSystems).map(([name, count]) => ({ name, count })),
        devices: Object.entries(devices).map(([name, count]) => ({ name, count })),
        topPages,
    };
}
