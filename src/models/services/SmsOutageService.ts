/**
 * SmsOutageService — tells riders when SMS commute alerts are down for the day, and gives the admin
 * panel the SMS service's status.
 *
 * The SMS service runs separately (services/sms). A crashed SMS service can't announce its own
 * outage, so this API watches for one every minute:
 *
 *   heartbeat  sms.heartbeats.last_seen older than 10 min while alerts are still due today
 *   planner    no plans by 06:00 although riders have a commute today
 *   Twilio     5 or more texts in the last 10 min, at least half of them failed
 *   admin      the "Declare SMS outage today" button
 *
 * Declaring writes sms.outage_days (once per day), then emails each affected rider once
 * (sms.outage_notices is written before the email). The SMS service sends nothing more that day.
 * Only runs once SMS_SERVICE_URL is set: before the service is deployed, there is no outage to report.
 */
import { serviceDb, hasServiceKey } from '../lib/serverDb';
import { SecurityEventService } from './SecurityEventService';
import { reginaDateKey } from './ReginaTime';
import { SITE } from '../data/legal';
import { smsRevokedIds } from './SmsAccessService';

const sms = () => serviceDb().schema('sms');

const HEARTBEAT_STALE_MS = 10 * 60_000;
const ALERT_DAY_START_MIN = 4 * 60 + 30;   // the planner's first run
const PLANNER_DEADLINE_MIN = 6 * 60;
const TWILIO_WINDOW_MS = 10 * 60_000, TWILIO_MIN_SENDS = 5;
const BATCH = 100;                          // Resend's batch limit
const OFFSET_MS = 6 * 60 * 60_000;          // Regina, UTC−6 all year

const reginaMinutes = (now: number) => { const d = new Date(now - OFFSET_MS); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const reginaWeekday = (now: number) => new Date(now - OFFSET_MS).getUTCDay();

export interface OutageEmail { to: string; subject: string; text: string }
type BatchMailer = (emails: OutageEmail[]) => Promise<void>;

/** Resend's batch endpoint: up to 100 separate emails in one call, so riders never see each other's address */
const resendBatch: BatchMailer = async emails => {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not set');
    const from = process.env.ALERT_FROM ?? 'Transit Regina Alerts <alerts@transitregina.ca>';
    const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(emails.map(e => ({ from, to: [e.to], subject: e.subject, text: e.text }))),
        signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Resend answered ${res.status}`);
};
let mailer: BatchMailer = resendBatch;

/** The email from the design doc, word for word */
export function outageEmail(date: string): { subject: string; text: string } {
    const label = new Date(date + 'T12:00:00Z').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
    return {
        subject: `No TransitR SMS alerts today (${label})`,
        text: [
            "Our text alert service is down, so you won't receive SMS alerts for your routes today.",
            `You can still see live bus times in the TransitR app: ${SITE.url}/map`,
            "Alerts start again tomorrow. You don't need to do anything.",
            '',
            `Manage alerts: ${SITE.url}/profile`,
        ].join('\n'),
    };
}

/** Does the query return any row? Throws on a database error, so a failed read is never taken as "nothing there". */
async function any(q: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<boolean> {
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return !!data?.length;
}

/** Riders with a commute today who are opted in to texts, and not switched off by an admin */
async function subscribersToday(now: number): Promise<{ user_id: string; arrive_by: string }[]> {
    const { data: schedules, error } = await serviceDb().from('weekly_schedules').select('user_id, arrive_by').eq('day_of_week', reginaWeekday(now)).eq('enabled', true);
    if (error) throw new Error(error.message);
    if (!schedules?.length) return [];
    const { data: people } = await serviceDb().from('profiles').select('id').in('id', [...new Set(schedules.map(s => s.user_id))]).eq('sms_opted_in', true).eq('mobile_verified', true);
    const revoked = await smsRevokedIds((people ?? []).map(p => p.id as string));
    const ok = new Set((people ?? []).map(p => p.id as string).filter(id => !revoked.has(id)));
    return schedules.filter(s => ok.has(s.user_id));
}

/** Who gets the outage email: opted-in riders with alerts still ahead today (or no plan yet, for a commute still to come) */
async function affectedRiders(date: string, now: number): Promise<{ id: string; email: string }[]> {
    const subs = await subscribersToday(now);
    if (!subs.length) return [];
    const { data: pending } = await sms().from('alerts').select('user_id').eq('service_date', date).eq('status', 'pending').in('kind', ['leave_now', 'alight', 'notice']);
    const { data: plans } = await sms().from('trip_plans').select('user_id').eq('service_date', date);
    const withAlerts = new Set((pending ?? []).map(a => a.user_id as string));
    const planned = new Set((plans ?? []).map(p => p.user_id as string));
    const nowMin = reginaMinutes(now);
    const ids = new Set(subs.filter(s => {
        if (withAlerts.has(s.user_id)) return true;
        const [h, m] = String(s.arrive_by).split(':').map(Number);
        return !planned.has(s.user_id) && h * 60 + (m || 0) > nowMin;       // never planned, and the trip is still to come
    }).map(s => s.user_id));
    if (!ids.size) return [];
    const { data: people } = await serviceDb().from('profiles').select('id, email').in('id', [...ids]).not('email', 'is', null);
    return (people ?? []).filter(p => p.email).map(p => ({ id: p.id as string, email: p.email as string }));
}

export const SmsOutageService = {
    /** Is the SMS service deployed? (The main API only watches it once it is.) */
    configured(): boolean {
        return !!process.env.SMS_SERVICE_URL && hasServiceKey();
    },

    /** Runs every minute from server.ts. Returns the cause when it declared an outage. */
    async check(now = Date.now()): Promise<string | null> {
        if (!SmsOutageService.configured()) return null;
        const nowMin = reginaMinutes(now), date = reginaDateKey(now);
        if (nowMin < ALERT_DAY_START_MIN) return null;
        const { data: declared } = await sms().from('outage_days').select('service_date').eq('service_date', date).maybeSingle();
        if (declared) return null;

        const pendingToday = await any(sms().from('alerts').select('id').eq('service_date', date).eq('status', 'pending').limit(1));
        const plansToday = await any(sms().from('trip_plans').select('id').eq('service_date', date).limit(1));
        const subs = plansToday ? [] : await subscribersToday(now);
        const stillToCome = subs.some(s => { const [h, m] = String(s.arrive_by).split(':').map(Number); return h * 60 + (m || 0) > nowMin; });

        let cause: string | null = null;
        // heartbeat: only during alert hours (alerts still due, or commutes not yet planned)
        if (pendingToday || stillToCome) {
            const { data: beat } = await sms().from('heartbeats').select('last_seen').eq('service', 'sms').maybeSingle();
            const seen = beat?.last_seen ? Date.parse(beat.last_seen) : 0;
            if (now - seen > HEARTBEAT_STALE_MS) cause = seen ? `The SMS service has not checked in since ${new Date(seen).toISOString()}` : 'The SMS service has never checked in';
        }
        if (!cause && nowMin >= PLANNER_DEADLINE_MIN && !plansToday && stillToCome) cause = 'The daily planner made no plans by 6:00 AM';
        if (!cause) {
            const since = new Date(now - TWILIO_WINDOW_MS).toISOString();
            const { data: recent, error } = await sms().from('messages').select('status').gte('created_at', since).eq('dry_run', false).limit(1000);
            if (error) throw new Error(error.message);
            const sent = recent?.length ?? 0, failed = (recent ?? []).filter(m => m.status === 'failed' || m.status === 'undelivered').length;
            if (sent >= TWILIO_MIN_SENDS && failed * 2 >= sent) cause = `${failed} of the last ${sent} texts failed at Twilio`;
        }
        if (!cause) return null;
        await SmsOutageService.declare(cause, null, now);
        return cause;
    },

    /**
     * Declares today an outage and emails the affected riders. Returns how many were emailed, or
     * `declared: false` when today was already declared (nobody is emailed twice).
     */
    async declare(cause: string, declaredBy: string | null, now = Date.now()): Promise<{ declared: boolean; emailed: number }> {
        const date = reginaDateKey(now);
        const { error } = await sms().from('outage_days').insert({ service_date: date, cause: cause.slice(0, 300), declared_by: declaredBy });
        if (error) {
            if (/duplicate|unique/i.test(error.message)) return { declared: false, emailed: 0 };
            throw new Error(`Could not record the outage: ${error.message}`);
        }
        // Nothing more goes out today, even if the SMS service is still partly working
        await sms().from('alerts').update({ status: 'suppressed', updated_at: new Date(now).toISOString() }).eq('service_date', date).eq('status', 'pending');

        const riders = await affectedRiders(date, now);
        const { subject, text } = outageEmail(date);
        let emailed = 0;
        for (let i = 0; i < riders.length; i += BATCH) {
            const chunk = riders.slice(i, i + BATCH);
            // The notice row first: a rider already noticed (a retry, a second signal) is left out
            const { data: fresh } = await sms().from('outage_notices')
                .upsert(chunk.map(r => ({ user_id: r.id, service_date: date })), { onConflict: 'user_id,service_date', ignoreDuplicates: true }).select('user_id');
            const toSend = chunk.filter(r => (fresh ?? []).some(f => f.user_id === r.id));
            if (!toSend.length) continue;
            try {
                await mailer(toSend.map(r => ({ to: r.email, subject, text })));
                emailed += toSend.length;
            } catch (err) {
                // Resend refused the whole batch, so nobody in it got the email: free them for a retry
                await sms().from('outage_notices').delete().eq('service_date', date).in('user_id', toSend.map(r => r.id));
                console.error('[SMS outage] Rider emails failed:', (err as Error).message);
            }
        }
        await sms().from('outage_days').update({ emails_sent: emailed }).eq('service_date', date);
        await SecurityEventService.record({ type: 'sms_outage', severity: 'critical', userId: declaredBy ?? undefined,
            message: `SMS alerts are off for ${date}: ${cause.slice(0, 160)}. ${emailed} rider${emailed === 1 ? '' : 's'} emailed.` });
        return { declared: true, emailed };
    },

    /** What the admin Security page shows about text alerts today */
    async status(now = Date.now()) {
        const date = reginaDateKey(now);
        if (!SmsOutageService.configured()) return { configured: false as const, date };
        const [beat, plans, alerts, quota, outage, settings] = await Promise.all([
            sms().from('heartbeats').select('last_seen, started_at, details').eq('service', 'sms').maybeSingle(),
            sms().from('trip_plans').select('status').eq('service_date', date),
            sms().from('alerts').select('status').eq('service_date', date),
            sms().from('daily_quotas').select('quota, sent_count, active_subscribers, planned_alerts').eq('service_date', date).maybeSingle(),
            sms().from('outage_days').select('cause, declared_at, emails_sent').eq('service_date', date).maybeSingle(),
            sms().from('settings').select('dry_run, allowlist, updated_at').maybeSingle(),
        ]);
        const tally = (rows: { status: string }[] | null) => (rows ?? []).reduce<Record<string, number>>((t, r) => { t[r.status] = (t[r.status] ?? 0) + 1; return t; }, {});
        const lastSeen = beat.data?.last_seen ?? null;
        return {
            configured: true as const, date,
            up: !!lastSeen && now - Date.parse(lastSeen) <= HEARTBEAT_STALE_MS,
            lastSeen,
            mode: beat.data?.details ? (beat.data.details.enabled === false ? 'off' : beat.data.details.dryRun !== false ? 'dry run' : beat.data.details.pilot ? 'pilot' : 'live') : null,
            plans: tally(plans.data), alerts: tally(alerts.data),
            quota: quota.data ?? null,
            outage: outage.data ?? null,
            // Dry run and pilot numbers, set on this card. null: the table isn't there yet (script sms_003).
            settings: settings.error ? null : {
                dryRun: settings.data?.dry_run !== false,
                allowlist: (settings.data?.allowlist ?? []) as string[],
                updatedAt: settings.data?.updated_at ?? null,
            },
            error: beat.error?.message ?? plans.error?.message ?? null,
        };
    },

    /** Test hook: null puts Resend back */
    _setMailer(fn: BatchMailer | null) { mailer = fn ?? resendBatch; },
};
