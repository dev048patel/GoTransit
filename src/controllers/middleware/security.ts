/**
 * security.ts — small, dependency-free building blocks used by every route:
 * response headers, rate limiting, and input checks.
 */
import { Request, Response, NextFunction } from 'express';
import { SecurityEventService } from '../../models/services/SecurityEventService';

/** The caller's address. `trust proxy` is set in apiApp.ts so that this is the visitor, not Railway. */
export function clientIp(req: Request): string {
    return req.ip || req.socket.remoteAddress || 'unknown';
}

/** Headers for a JSON API: no framing, no sniffing, no caching of private answers, HTTPS only. */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}

const limiters: Map<string, { count: number; resetAt: number }>[] = [];
// ponytail: counters live in this process's memory. Fine for one backend instance; move to a
// shared store (Redis / Upstash) if the API is ever scaled to several instances.
setInterval(() => { const now = Date.now(); for (const m of limiters) for (const [k, v] of m) if (v.resetAt <= now) m.delete(k); }, 60_000).unref();

/** Allow `max` requests per `windowMs` from one address; answer 429 after that. */
export function rateLimit(name: string, max: number, windowMs = 60_000) {
    const hits = new Map<string, { count: number; resetAt: number }>();
    limiters.push(hits);
    return (req: Request, res: Response, next: NextFunction): void => {
        const key = clientIp(req), now = Date.now();
        let h = hits.get(key);
        if (!h || h.resetAt <= now) { h = { count: 0, resetAt: now + windowMs }; hits.set(key, h); }
        h.count++;
        res.setHeader('RateLimit-Limit', String(max));
        res.setHeader('RateLimit-Remaining', String(Math.max(0, max - h.count)));
        if (h.count <= max) { next(); return; }
        res.setHeader('Retry-After', String(Math.ceil((h.resetAt - now) / 1000)));
        // one event per window per address, not one per blocked request
        if (h.count === max + 1) void SecurityEventService.record({ type: 'rate_limited', severity: 'warning', ip: key, path: req.originalUrl, message: `Rate limit "${name}" exceeded` });
        res.status(429).json({ error: 'Too many requests. Please slow down.' });
    };
}

/** Browser push services. The backend only ever sends a push to one of these. */
const PUSH_HOSTS = /^(fcm\.googleapis\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|([a-z0-9-]+\.)*notify\.windows\.com|([a-z0-9-]+\.)*push\.apple\.com)$/;
export function isPushEndpoint(v: unknown): v is string {
    if (typeof v !== 'string' || v.length > 1000) return false;
    try { const u = new URL(v); return u.protocol === 'https:' && !u.port && !u.username && PUSH_HOSTS.test(u.hostname); }
    catch { return false; }
}

/* ── input checks ── */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);
export const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
export const isDateOnly = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** Reject the request with 400 and note it; returns true when it did. */
export function reject(req: Request, res: Response, message: string): true {
    void SecurityEventService.record({ type: 'validation_failed', severity: 'info', throttle: true, ip: clientIp(req), path: req.originalUrl, message });
    res.status(400).json({ error: message });
    return true;
}
