/**
 * Housekeeping:
 *   heartbeat   every 30 s: tells the main API this service is alive (it emails riders if it stops)
 *   retention   once a day: deletes SMS data older than 90 days, the same window as visitor data
 */
import { sms } from '../db';
import { config } from '../config';
import { sendSettings } from '../settings';
import { addDays, reginaDate } from '../time';

export const HEARTBEAT_ID = 'sms';
const RETENTION_DAYS = 90;
const startedAt = new Date().toISOString();

export async function writeHeartbeat(details: Record<string, unknown>): Promise<void> {
    const c = config();
    const s = await sendSettings().catch(() => null);
    const { error } = await sms().from('heartbeats').upsert({
        service: HEARTBEAT_ID, last_seen: new Date().toISOString(), started_at: startedAt,
        details: { ...details, enabled: c.enabled, dryRun: s?.dryRun ?? null, pilot: s ? s.allowlist.length > 0 : null },
    });
    if (error) throw new Error(`heartbeat: ${error.message}`);
}

export async function runRetention(now = Date.now()): Promise<void> {
    const cutoffDate = addDays(reginaDate(now), -RETENTION_DAYS);
    const cutoff = new Date(now - RETENTION_DAYS * 86_400_000).toISOString();
    const steps: [string, PromiseLike<{ error: { message: string } | null }>][] = [
        ['plans', sms().from('trip_plans').delete().lt('service_date', cutoffDate)],   // legs and alerts go with them
        ['messages', sms().from('messages').delete().lt('created_at', cutoff)],
        ['quotas', sms().from('daily_quotas').delete().lt('service_date', cutoffDate)],
        ['reports', sms().from('daily_reports').delete().lt('service_date', cutoffDate)],
        ['outage notices', sms().from('outage_notices').delete().lt('service_date', cutoffDate)],
        ['outage days', sms().from('outage_days').delete().lt('service_date', cutoffDate)],
    ];
    for (const [what, q] of steps) {
        const { error } = await q;
        if (error) console.error(`[Retention] Could not clean ${what}:`, error.message);
    }
}
