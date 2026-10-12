/**
 * SecurityEventService — one place where the backend records anything an admin should be able
 * to see: blocked requests, admin actions, failures of things the site depends on.
 *
 *  - Every event is kept in memory (last 500) and written to the `security_events` table.
 *  - Critical events email the admins straight away.
 *  - Ten warnings of one kind from one address inside ten minutes are escalated to a critical
 *    "burst" event, so repeated probing gets noticed without one stray request raising an alarm.
 *  - Emails are throttled (one per kind per 15 minutes) so an attack cannot flood the inbox.
 */
import { serviceDb, hasServiceKey } from '../lib/serverDb';

export type Severity = 'info' | 'warning' | 'critical';

export interface SecurityEvent {
    type: string;
    severity: Severity;
    message: string;
    ip?: string;
    userId?: string;
    path?: string;
    at: string;
}

type Mailer = (subject: string, text: string) => Promise<void>;

const MAX_KEPT = 500;
const BURST_COUNT = 10, BURST_WINDOW_MS = 10 * 60 * 1000;
const EMAIL_COOLDOWN_MS = 15 * 60 * 1000;

let events: SecurityEvent[] = [];
let bursts = new Map<string, { count: number; start: number; raised: boolean }>();
let lastEmail = new Map<string, number>();
let lastStored = new Map<string, number>();
const STORE_EVERY_MS = 60 * 1000, MAX_TRACKED = 5000;

function storedRecently(key: string): boolean {
    const now = Date.now();
    // Bounded memory: forget everything rather than grow without limit
    if (lastStored.size > MAX_TRACKED) lastStored.clear();
    if (bursts.size > MAX_TRACKED) bursts.clear();
    if (now - (lastStored.get(key) ?? 0) < STORE_EVERY_MS) return true;
    lastStored.set(key, now);
    return false;
}

/** Sends through Resend's HTTP API. Needs RESEND_API_KEY and ALERT_EMAILS (comma-separated). */
const resendMailer: Mailer = async (subject, text) => {
    const key = process.env.RESEND_API_KEY, to = (process.env.ALERT_EMAILS ?? '').split(',').map(s => s.trim()).filter(Boolean);
    if (!key || !to.length) return;
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.ALERT_FROM ?? 'Transit Regina Alerts <alerts@transitregina.ca>', to, subject, text }),
    });
    if (!res.ok) console.error('[Security] Alert email failed:', res.status);
};
let mailer: Mailer = resendMailer;

async function alertAdmins(e: SecurityEvent): Promise<void> {
    const last = lastEmail.get(e.type) ?? 0;
    if (Date.now() - last < EMAIL_COOLDOWN_MS) return;
    lastEmail.set(e.type, Date.now());
    const lines = [e.message, '', `Type: ${e.type}`, `When: ${e.at}`, ...(e.ip ? [`Address: ${e.ip}`] : []), ...(e.path ? [`Path: ${e.path}`] : []),
        ...(e.userId ? [`User: ${e.userId}`] : []), '', 'See the Security page in the admin panel for the full list.'];
    try { await mailer(`[Transit Regina] ${e.severity.toUpperCase()}: ${e.message}`.slice(0, 140), lines.join('\n')); }
    catch (err) { console.error('[Security] Alert email error:', (err as Error).message); }
}

export const SecurityEventService = {
    /**
     * `throttle`: for events anyone can cause at will (a request with no login, a malformed request).
     * They are stored at most once a minute per kind and address, so they cannot flood the log or
     * push real events out of view. Every one still counts towards the "repeated probing" alert.
     */
    async record(input: Omit<SecurityEvent, 'at'> & { throttle?: boolean }): Promise<void> {
        const { throttle, ...fields } = input;
        const e: SecurityEvent = { ...fields, message: fields.message.slice(0, 300), path: fields.path?.slice(0, 200), at: new Date().toISOString() };
        if (!(throttle && storedRecently(`${e.type}|${e.ip ?? ''}`))) {
            events.push(e);
            if (events.length > MAX_KEPT) events = events.slice(-MAX_KEPT);
            if (e.severity !== 'info') console.warn(`[Security] ${e.severity} ${e.type}: ${e.message}`);

            if (hasServiceKey()) {
                serviceDb().from('security_events')
                    .insert({ type: e.type, severity: e.severity, message: e.message, ip: e.ip ?? null, user_id: e.userId ?? null, path: e.path ?? null })
                    .then(({ error }) => { if (error) console.error('[Security] Could not store event:', error.message); });
            }
        }

        if (e.severity === 'critical') { await alertAdmins(e); return; }
        if (e.severity === 'warning' && e.ip) {
            const key = `${e.type}|${e.ip}`, now = Date.now();
            let b = bursts.get(key);
            if (!b || now - b.start > BURST_WINDOW_MS) { b = { count: 0, start: now, raised: false }; bursts.set(key, b); }
            b.count++;
            if (b.count >= BURST_COUNT && !b.raised) {
                b.raised = true;
                await SecurityEventService.record({ type: 'burst', severity: 'critical', ip: e.ip, path: e.path,
                    message: `${b.count} "${e.type}" events from one address in under 10 minutes` });
            }
        }
    },

    /** Newest first. Used when the table is unavailable, and by tests. */
    recent(limit = 100): SecurityEvent[] { return events.slice(-limit).reverse(); },

    /** Test hooks. */
    _setMailer(fn: Mailer | null) { mailer = fn ?? resendMailer; },
    _reset() { events = []; bursts = new Map(); lastEmail = new Map(); lastStored = new Map(); },
};
