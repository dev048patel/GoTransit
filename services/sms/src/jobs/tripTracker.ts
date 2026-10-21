/**
 * Trip tracker. Every 15 seconds, for today's trips with alerts still to come:
 *
 *   1. Match each bus ride to a live bus (20 minutes before it is due at the boarding stop).
 *   2. Move "leave now" to the live time of the first bus.
 *   3. Time "get off at the next stop" from the live bus: when it nears the stop before the rider's,
 *      or 2 minutes before its predicted arrival, whichever is first. Without live data the timetable
 *      time set by the planner stands.
 *   4. When a transfer will be missed, drop the alerts for the rest of the trip. The rider gets no
 *      further text: "get off" for a bus they aren't on would be wrong.
 *
 * The tracker only moves due times and writes live data; the sender does all the sending.
 */
import { must, sms } from '../db';
import { timetable } from '../transit/timetable';
import { liveBuses, predictions, sameRoute } from '../transit/transitLive';
import { metresBetween } from '../transit/geo';
import { ALIGHT_LEAD_MIN, LEAVE_BUFFER_MIN } from '../alerts/buildAlerts';
import { instantOf, minutesOn, reginaDate } from '../time';
import { AlertDb, LegDb, PlanDb } from '../types';

// Trips with any alert still to come within 3 hours (the planner's longest trip is 2.5 h). Shorter would
// drop a trip between "leave now" and a "next stop" that is still far off, and its bus would never be matched.
const HORIZON_MS = 3 * 60 * 60_000;
const MATCH_BEFORE_MS = 20 * 60_000;  // start looking for the live bus 20 min before it is due
const MATCH_RETRY_MS = 60_000;
const NEAR_PREV_STOP_METRES = 150;
const MIN_SHIFT_MS = 30_000;          // ignore changes smaller than this, to save writes
const COMPLETE_AFTER_MS = 15 * 60_000;

const iso = (ms: number) => new Date(ms).toISOString();

export async function runTracker(now = Date.now()): Promise<{ plans: number; missedTransfers: number }> {
    const date = reginaDate(now);
    await suppressOutageDay(date);

    const alerts = must(await sms().from('alerts').select('id, plan_id, leg_id, user_id, service_date, kind, due_at, status, attempts')
        .eq('service_date', date).eq('status', 'pending').lte('due_at', iso(now + HORIZON_MS)), 'reading pending alerts') as AlertDb[];
    const planIds = [...new Set(alerts.map(a => a.plan_id))];
    if (!planIds.length) { await completeFinishedPlans(date, now); return { plans: 0, missedTransfers: 0 }; }

    const plans = must(await sms().from('trip_plans').select('*').in('id', planIds), 'reading plans') as PlanDb[];
    const legs = must(await sms().from('trip_legs').select('*').in('plan_id', planIds).order('seq'), 'reading legs') as LegDb[];

    let missedTransfers = 0;
    for (const plan of plans) {
        if (plan.status === 'cancelled' || plan.status === 'completed' || plan.status === 'no_service') continue;
        try {
            const planLegs = legs.filter(l => l.plan_id === plan.id);
            const planAlerts = alerts.filter(a => a.plan_id === plan.id);
            if (await trackPlan(plan, planLegs, planAlerts, date, now)) missedTransfers++;
        } catch (err) {
            console.error(`[Tracker] Plan ${plan.id}:`, (err as Error).message);
        }
    }
    await completeFinishedPlans(date, now);
    return { plans: plans.length, missedTransfers };
}

/** true when a transfer will be missed and the rest of the trip's alerts were dropped */
async function trackPlan(plan: PlanDb, legs: LegDb[], alerts: AlertDb[], date: string, now: number): Promise<boolean> {
    for (const leg of legs) {
        const boardAt = Date.parse(leg.live_board_at ?? leg.sched_board_at);

        if (!leg.bus_id) {
            const inWindow = now >= boardAt - MATCH_BEFORE_MS && now <= boardAt + 5 * 60_000;
            if (inWindow && (!leg.matched_at || now - Date.parse(leg.matched_at) > MATCH_RETRY_MS)) await matchBus(leg, date, now);
        } else if (now < boardAt + 2 * 60_000) {
            await refreshBoarding(leg, date);
        }

        const alight = alerts.find(a => a.leg_id === leg.id && a.kind === 'alight');
        if (alight && leg.bus_id && now >= Date.parse(leg.live_board_at ?? leg.sched_board_at) - 60_000) await timeAlight(leg, alight, date, now);
    }

    // "Leave now" (or a partial trip's notice) follows the first bus's live time
    const first = legs[0];
    const leave = alerts.find(a => a.kind === 'leave_now' || (a.kind === 'notice' && plan.status === 'partial'));
    if (first?.live_board_at && leave) {
        const target = Math.max(now, Date.parse(first.live_board_at) - (first.walk_before_min + LEAVE_BUFFER_MIN) * 60_000);
        if (Math.abs(target - Date.parse(leave.due_at)) >= MIN_SHIFT_MS) await setDue(leave, target);
    }

    // A transfer that can no longer be made: the rider won't be on the later buses, so their alerts are
    // dropped. No new text is sent.
    for (let i = 0; i + 1 < legs.length; i++) {
        const a = legs[i], b = legs[i + 1];
        if (!a.live_alight_at || !alerts.some(x => x.leg_id === b.id && x.kind === 'alight')) continue;
        const ready = Date.parse(a.live_alight_at) + (b.walk_before_min + 1) * 60_000;
        const departs = Date.parse(b.live_board_at ?? b.sched_board_at);
        if (ready > departs && now < departs + 60_000) {
            console.log(`[Tracker] Plan ${plan.id}: transfer to Route ${b.route_num} will be missed, dropping the rest of the trip's alerts`);
            await sms().from('alerts').update({ status: 'skipped', updated_at: new Date().toISOString() })
                .in('leg_id', legs.slice(i + 1).map(l => l.id)).eq('status', 'pending');
            return true;
        }
    }
    return false;
}

async function matchBus(leg: LegDb, date: string, now: number): Promise<void> {
    const preds = await predictions(leg.board_stop_id);
    const sched = minutesOn(date, leg.sched_board_at);
    const pick = (preds ?? [])
        .filter(p => sameRoute(p.route, leg.route_num) && p.minutes - sched >= -5 && p.minutes - sched <= 30)
        .sort((x, y) => Math.abs(x.minutes - sched) - Math.abs(y.minutes - sched))[0];
    const update: Partial<LegDb> = { matched_at: iso(now) };
    if (pick?.busId) Object.assign(update, { bus_id: pick.busId, live_board_at: instantOf(date, pick.minutes).toISOString() });
    await sms().from('trip_legs').update(update).eq('id', leg.id);
    Object.assign(leg, update);
}

/** While the rider waits, keep the bus's predicted time at the boarding stop current */
async function refreshBoarding(leg: LegDb, date: string): Promise<void> {
    const p = (await predictions(leg.board_stop_id))?.find(x => x.busId === leg.bus_id);
    if (!p) return;
    const at = instantOf(date, p.minutes).getTime();
    if (!leg.live_board_at || Math.abs(at - Date.parse(leg.live_board_at)) >= MIN_SHIFT_MS) {
        leg.live_board_at = iso(at);
        await sms().from('trip_legs').update({ live_board_at: leg.live_board_at }).eq('id', leg.id);
    }
}

async function timeAlight(leg: LegDb, alert: AlertDb, date: string, now: number): Promise<void> {
    const tt = timetable();
    const candidates: number[] = [];

    const p = (await predictions(leg.alight_stop_id))?.find(x => x.busId === leg.bus_id);
    if (p) {
        const at = instantOf(date, p.minutes).getTime();
        candidates.push(at - ALIGHT_LEAD_MIN * 60_000);
        if (!leg.live_alight_at || Math.abs(at - Date.parse(leg.live_alight_at)) >= MIN_SHIFT_MS) {
            leg.live_alight_at = iso(at);
            await sms().from('trip_legs').update({ live_alight_at: leg.live_alight_at }).eq('id', leg.id);
        }
    }

    const bus = (await liveBuses())?.find(b => b.busId === leg.bus_id);
    const prev = leg.prev_stop_id ? tt.stopIndex(leg.prev_stop_id) : undefined;
    if (bus && prev !== undefined) {
        const fromPrev = metresBetween(bus.lat, bus.lng, tt.lat[prev], tt.lng[prev]);
        const boarded = now > Date.parse(leg.live_board_at ?? leg.sched_board_at);
        // A one-stop ride: the "stop before" is the boarding stop, so fire once the bus has pulled away from it
        if (leg.prev_stop_id === leg.board_stop_id ? boarded && fromPrev > NEAR_PREV_STOP_METRES : boarded && fromPrev <= NEAR_PREV_STOP_METRES) candidates.push(now);
    }

    if (!candidates.length) return;
    const due = Math.max(Math.min(...candidates), now);
    if (Math.abs(due - Date.parse(alert.due_at)) >= MIN_SHIFT_MS || due === now) await setDue(alert, due);
}

async function setDue(alert: AlertDb, due: number): Promise<void> {
    alert.due_at = iso(due);
    await sms().from('alerts').update({ due_at: alert.due_at, updated_at: new Date().toISOString() }).eq('id', alert.id).eq('status', 'pending');
}

/** Once a day is declared an outage, nothing more is sent that day, even if the service recovers */
async function suppressOutageDay(date: string): Promise<void> {
    const { data } = await sms().from('outage_days').select('service_date').eq('service_date', date).maybeSingle();
    if (!data) return;
    await sms().from('alerts').update({ status: 'suppressed', updated_at: new Date().toISOString() }).eq('service_date', date).eq('status', 'pending');
}

/** Plans whose last bus arrived more than 15 minutes ago, with nothing left to send */
async function completeFinishedPlans(date: string, now: number): Promise<void> {
    const { data: plans } = await sms().from('trip_plans').select('id').eq('service_date', date)
        .in('status', ['planned', 'partial', 'active']).lt('arrive_at', iso(now - COMPLETE_AFTER_MS));
    if (!plans?.length) return;
    const ids = plans.map(p => p.id as string);
    const { data: open } = await sms().from('alerts').select('plan_id').in('plan_id', ids).in('status', ['pending', 'queued']);
    const busy = new Set((open ?? []).map(a => a.plan_id as string));
    const done = ids.filter(id => !busy.has(id));
    if (done.length) await sms().from('trip_plans').update({ status: 'completed', updated_at: new Date().toISOString() }).in('id', done);
}
