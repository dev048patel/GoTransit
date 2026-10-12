/**
 * HealthService — checks the things the site cannot work without and tells the admins when one
 * of them stops (and when it comes back). Run on a timer from server.ts; read by the admin panel.
 */
import { serviceDb, hasServiceKey } from '../lib/serverDb';
import { SecurityEventService } from './SecurityEventService';

export interface Check { name: string; ok: boolean; detail: string; since: string; }

const FAILS_BEFORE_ALERT = 2;   // one blip is not an outage
const state = new Map<string, { ok: boolean; fails: number; since: string; detail: string; alerted: boolean }>();
let lastRun: string | null = null;

async function probe(name: string, fn: () => Promise<string>): Promise<void> {
    let ok = true, detail = '';
    try { detail = await fn(); } catch (err) { ok = false; detail = (err as Error).message.slice(0, 160); }
    const now = new Date().toISOString();
    const s = state.get(name) ?? { ok: true, fails: 0, since: now, detail: '', alerted: false };
    if (ok) {
        if (s.alerted) await SecurityEventService.record({ type: 'dependency_recovered', severity: 'info', message: `${name} is working again` });
        state.set(name, { ok: true, fails: 0, since: s.ok ? s.since : now, detail, alerted: false });
    } else {
        const fails = s.fails + 1, alerted = s.alerted || fails >= FAILS_BEFORE_ALERT;
        if (alerted && !s.alerted) await SecurityEventService.record({ type: 'dependency_down', severity: 'critical', message: `${name} is not working: ${detail}` });
        state.set(name, { ok: false, fails, since: s.ok ? now : s.since, detail, alerted });
    }
}

export const HealthService = {
    async run(): Promise<void> {
        await probe('Database', async () => {
            const { error } = await serviceDb().from('profiles').select('id', { count: 'exact', head: true });
            if (error) throw new Error(error.message);
            return 'reachable';
        });
        await probe('Live bus feed', async () => {
            const url = process.env.TRANSIT_LIVE_API_URL;
            if (!url) throw new Error('TRANSIT_LIVE_API_URL is not set');
            const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
            if (!res.ok) throw new Error(`feed answered ${res.status}`);
            const buses = JSON.parse(await res.text());
            return `${Array.isArray(buses) ? buses.length : 0} buses reported`;
        });
        lastRun = new Date().toISOString();
    },

    report() {
        const config: string[] = [];
        if (!hasServiceKey()) config.push('SUPABASE_SERVICE_ROLE_KEY is not set: the backend is running with visitor-level database rights.');
        if (!process.env.RESEND_API_KEY || !process.env.ALERT_EMAILS) config.push('RESEND_API_KEY or ALERT_EMAILS is not set: alert emails are off.');
        if (process.env.TWILIO_AUTH_TOKEN && !process.env.BACKEND_URL) config.push('BACKEND_URL is not set: text-message replies (STOP/START) are refused.');
        const checks: Check[] = [...state.entries()].map(([name, s]) => ({ name, ok: s.ok, detail: s.detail, since: s.since }));
        return { lastRun, checks, config };
    },

    _reset() { state.clear(); lastRun = null; },
};
