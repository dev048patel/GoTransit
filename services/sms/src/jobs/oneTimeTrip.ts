/**
 * One-time trip texts. A rider who starts a trip on the map can ask to be texted for it (admins only
 * for now: the main API checks). The app sends the buses they chose; this finds them in the timetable
 * and stores a plan like a saved commute's (kind 'trip', no schedule), so the tracker and the sender
 * treat it the same way: "leave now", then "get off at the next stop" for each bus, on live times.
 *
 * Starting a trip cancels the rider's previous trip texts. A rider gets at most tripDailyCap trip
 * texts a day (SMS_TRIP_DAILY_CAP, default 10), counted apart from their commute texts.
 */
import { must, sms } from '../db';
import { config } from '../config';
import { timetable } from '../transit/timetable';
import { LatLng } from '../transit/planner';
import { ChosenLeg, journeyFor } from '../transit/chosenTrip';
import { buildPlan } from '../alerts/buildAlerts';
import { reginaDate, reginaMinutes } from '../time';

export interface TripRequest { userId: string; legs: ChosenLeg[]; origin: LatLng; destination: LatLng; destinationName: string | null }
export type TripResult =
    | { ok: true; planId: string; texts: number; leaveAt: string; arriveAt: string; textsLeft: number }
    | { ok: false; status: number; error: string };

const ACTIVE = ['planned', 'partial', 'active'];
/** Before docs/security/sms_004_one_time_trips.sql there is no kind column, and a plan needs a schedule */
const NOT_SET_UP = /kind|schedule_id|not-null|null value/i;
const SETUP_ERROR = 'Trip texts are not set up yet (run docs/security/sms_004_one_time_trips.sql).';
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Stops the texts still to come for the rider's trips today. Returns how many trips it stopped. */
export async function cancelTrips(userId: string, date: string): Promise<number> {
    const plans = must(await sms().from('trip_plans').select('id').eq('user_id', userId).eq('service_date', date).eq('kind', 'trip').in('status', ACTIVE),
        'reading trips') as { id: string }[];
    if (!plans.length) return 0;
    const ids = plans.map(p => p.id), stamp = new Date().toISOString();
    must(await sms().from('alerts').update({ status: 'skipped', updated_at: stamp }).in('plan_id', ids).eq('status', 'pending').select('id'), 'stopping trip texts');
    must(await sms().from('trip_plans').update({ status: 'cancelled', updated_at: stamp }).in('id', ids).select('id'), 'cancelling trips');
    return ids.length;
}

/** Trip texts the rider has had, or still has coming, today */
async function tripTextsToday(userId: string, date: string): Promise<number> {
    const plans = must(await sms().from('trip_plans').select('id').eq('user_id', userId).eq('service_date', date).eq('kind', 'trip'), 'reading trips') as { id: string }[];
    if (!plans.length) return 0;
    const alerts = must(await sms().from('alerts').select('id').in('plan_id', plans.map(p => p.id)).in('status', ['pending', 'queued', 'sent']), 'counting trip texts') as unknown[];
    return alerts.length;
}

export async function startTrip(req: TripRequest, now = new Date()): Promise<TripResult> {
    const c = config(), tt = timetable();
    const date = reginaDate(now), nowMin = reginaMinutes(now);
    if (!c.enabled) return { ok: false, status: 503, error: 'Text alerts are turned off right now.' };
    if (!tt.covers(date)) return { ok: false, status: 503, error: "The text alert timetable is out of date, so trips can't be texted today." };
    const { data: outage } = await sms().from('outage_days').select('service_date').eq('service_date', date).maybeSingle();
    if (outage) return { ok: false, status: 409, error: 'Text alerts are off for today.' };

    const journey = journeyFor(tt, date, req.legs, nowMin, req.origin, req.destination);
    if (!journey) return { ok: false, status: 409, error: "These buses don't run again today, so there is nothing to text." };
    const rows = buildPlan(tt, date, {
        scheduleId: null, kind: 'trip', userId: req.userId, arriveBy: hhmm(journey.arriveMin), departBy: null,
        originName: null, destinationName: req.destinationName,
    }, { status: 'planned', journey }, nowMin);

    // A new trip replaces the last one, so its unsent texts don't count against the limit
    let used: number;
    try {
        await cancelTrips(req.userId, date);
        used = await tripTextsToday(req.userId, date);
    } catch (err) {
        if (NOT_SET_UP.test((err as Error).message)) return { ok: false, status: 503, error: SETUP_ERROR };
        throw err;
    }
    if (used + rows.alerts.length > c.tripDailyCap) {
        const left = Math.max(0, c.tripDailyCap - used);
        return { ok: false, status: 429, error: `Trip texts are limited to ${c.tripDailyCap} a day for now. This trip needs ${rows.alerts.length} and ${left === 0 ? 'none are' : `only ${left} ${left === 1 ? 'is' : 'are'}`} left today.` };
    }

    const { data: planId, error } = await sms().rpc('create_plan', { p_plan: rows.plan, p_legs: rows.legs, p_alerts: rows.alerts, p_daily_max: c.dailyLimitMax });
    if (error) {
        if (NOT_SET_UP.test(error.message)) return { ok: false, status: 503, error: SETUP_ERROR };
        throw new Error(`create_plan: ${error.message}`);
    }
    return { ok: true, planId: planId as string, texts: rows.alerts.length, leaveAt: rows.plan.leave_at!, arriveAt: rows.plan.arrive_at!, textsLeft: c.tripDailyCap - used - rows.alerts.length };
}
