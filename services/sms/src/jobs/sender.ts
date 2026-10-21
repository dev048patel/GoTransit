/**
 * Sender. Every few seconds: take the alerts that are due, claim each one (which checks the outage
 * day, the per-rider cap and the day's quota in one database step), write its text and send it.
 *
 * A late alert is worse than none ("get off at the next stop" three stops late), so each kind has a
 * freshness window; past it the alert is skipped, not sent.
 */
import { app, must, sms } from '../db';
import { config } from '../config';
import { timetable } from '../transit/timetable';
import { renderAlert } from '../alerts/render';
import { deliver } from '../delivery/outbox';
import { ERROR_OPTED_OUT } from '../delivery/twilio';
import { emailAdmins } from '../delivery/email';
import { AlertDb, AlertKind, LegDb, PlanDb } from '../types';

/** How long after its due time an alert is still worth sending */
export const FRESH_MS: Record<AlertKind, number> = {
    leave_now: 3 * 60_000,
    alight: 60_000,
    notice: 10 * 60_000,
};
const RETRY_AFTER_MS = 20_000;
const MAX_ATTEMPTS = 3;
const BATCH = 50;

export const isFresh = (a: Pick<AlertDb, 'kind' | 'due_at'>, now: number) => now - Date.parse(a.due_at) <= FRESH_MS[a.kind];

export interface SenderResult { sent: number; skipped: number; failed: number; held: number }

export async function runSender(now = Date.now()): Promise<SenderResult> {
    const result: SenderResult = { sent: 0, skipped: 0, failed: 0, held: 0 };
    const cfg = config();
    if (!cfg.enabled) return result;

    const due = must(await sms().from('alerts').select('id, plan_id, leg_id, user_id, service_date, kind, due_at, status, attempts')
        .eq('status', 'pending').lte('due_at', new Date(now).toISOString()).order('due_at').limit(BATCH), 'reading due alerts') as AlertDb[];

    for (const alert of due) {
        try {
            await sendOne(alert, now, result);
        } catch (err) {
            result.failed++;
            console.error(`[Sender] Alert ${alert.id} failed:`, (err as Error).message);
            await sms().from('alerts').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', alert.id).in('status', ['pending', 'queued']);
        }
    }
    return result;
}

async function sendOne(alert: AlertDb, now: number, result: SenderResult): Promise<void> {
    const cfg = config();
    if (!isFresh(alert, now)) {
        await sms().from('alerts').update({ status: 'skipped', updated_at: new Date().toISOString() }).eq('id', alert.id).eq('status', 'pending');
        result.skipped++;
        return;
    }

    const { data: outcome, error } = await sms().rpc('claim_alert', { p_alert: alert.id, p_per_user_cap: cfg.perUserDailyCap });
    if (error) throw new Error(`claim: ${error.message}`);
    if (outcome !== 'queued') {
        if (outcome === 'over_quota') await warnQuota(alert.service_date);
        if (outcome !== 'taken') result.held++;
        return;
    }

    // The rider may have opted out or changed number since the morning: check at send time
    const profile = must(await app().from('profiles').select('mobile_number, sms_opted_in, mobile_verified').eq('id', alert.user_id).maybeSingle(), 'reading profile') as
        { mobile_number: string | null; sms_opted_in: boolean | null; mobile_verified: boolean | null } | null;
    if (!profile?.sms_opted_in || !profile.mobile_verified || !profile.mobile_number) {
        await sms().rpc('release_alert', { p_alert: alert.id, p_retry_at: alert.due_at });
        await sms().from('alerts').update({ status: 'skipped', updated_at: new Date().toISOString() }).eq('id', alert.id);
        result.skipped++;
        return;
    }

    const plan = must(await sms().from('trip_plans').select('*').eq('id', alert.plan_id).single(), 'reading plan') as PlanDb;
    const legs = must(await sms().from('trip_legs').select('*').eq('plan_id', alert.plan_id).order('seq'), 'reading legs') as LegDb[];
    const body = renderAlert(timetable(), plan, legs, alert);

    const d = await deliver({ to: profile.mobile_number, body, userId: alert.user_id, alertId: alert.id, kind: 'alert' });
    const stamp = new Date().toISOString();
    if (d.ok) {
        await sms().from('alerts').update({ status: 'sent', sent_at: stamp, updated_at: stamp }).eq('id', alert.id);
        // The first text of the day starts the trip; a no-service notice is all there is
        if (alert.kind === 'leave_now' || alert.kind === 'notice') {
            await sms().from('trip_plans').update({ status: plan.status === 'no_service' ? 'completed' : 'active', updated_at: stamp }).eq('id', plan.id).in('status', ['planned', 'partial', 'no_service']);
        }
        result.sent++;
        await warnQuota(alert.service_date);
        return;
    }

    if (d.code === ERROR_OPTED_OUT) {
        await app().from('profiles').update({ sms_opted_in: false }).eq('id', alert.user_id);
        console.warn(`[Sender] Rider ${alert.user_id} has replied STOP to Twilio; opted them out here too`);
    }
    if (d.retryable && alert.attempts + 1 < MAX_ATTEMPTS && isFresh(alert, now + RETRY_AFTER_MS)) {
        await sms().rpc('release_alert', { p_alert: alert.id, p_retry_at: new Date(now + RETRY_AFTER_MS).toISOString() });
        result.held++;
        return;
    }
    await sms().from('alerts').update({ status: 'failed', updated_at: stamp }).eq('id', alert.id);
    result.failed++;
    console.error(`[Sender] Alert ${alert.id} not sent (${d.code ?? 'no code'}): ${d.error}`);
}

/** Emails admins once at 80% of the day's quota and once at 100% */
async function warnQuota(date: string): Promise<void> {
    const { data: q } = await sms().from('daily_quotas').select('*').eq('service_date', date).maybeSingle();
    if (!q || !q.quota) return;
    for (const [flag, share] of [['warned_80', 0.8], ['warned_100', 1]] as const) {
        if (q[flag] || q.sent_count < q.quota * share) continue;
        const { data: claimed } = await sms().from('daily_quotas').update({ [flag]: true }).eq('service_date', date).eq(flag, false).select('service_date');
        if (!claimed?.length) continue;
        await emailAdmins(`${share * 100}% of today's SMS quota used`,
            `${q.sent_count} of ${q.quota} texts have been sent for ${date} (${q.active_subscribers} riders, ${q.planned_alerts} planned alerts).\n\n` +
            (share === 1 ? 'Further alerts today are held as over_quota. ' : '') +
            'The quota follows the day\'s plans, so reaching it usually means a bug such as a resend loop. If texts must stop, declare an SMS outage for today on the admin Security page.');
    }
}
