/**
 * Daily planner. Builds today's trip plans and alerts from the riders' saved commutes
 * (public.weekly_schedules). Runs every 10 minutes from 04:30, so a failed run retries by itself and
 * a commute saved later in the day is still planned. Each commute is planned once a day: the
 * database refuses a second plan for the same (schedule, date).
 */
import { app, inChunks, must, sms } from '../db';
import { smsRevoked } from '../access';
import { config } from '../config';
import { timetable } from '../transit/timetable';
import { planArriveBy } from '../transit/planner';
import { buildPlan } from '../alerts/buildAlerts';
import { emailAdmins } from '../delivery/email';
import { parseHhmm, reginaDate, reginaMinutes, reginaWeekday } from '../time';

/** Planning a commute that starts in under this many minutes is pointless: the rider is already on the way */
const TOO_LATE_MIN = 20;

interface Schedule { id: string; user_id: string; arrive_by: string; depart_by: string | null; from_dest_id: string | null; to_dest_id: string | null }
interface Profile { id: string; mobile_number: string | null; sms_opted_in: boolean | null; mobile_verified: boolean | null; account_status: string | null }
interface Place { id: string; name: string; lat: number; lng: number }

let warnedExpiredOn = '';

export interface PlannerResult { date: string; planned: number; alreadyPlanned: number; tooLate: number; ineligible: number; failed: number }

export async function runPlanner(now = new Date()): Promise<PlannerResult> {
    const date = reginaDate(now), nowMin = reginaMinutes(now);
    const result: PlannerResult = { date, planned: 0, alreadyPlanned: 0, tooLate: 0, ineligible: 0, failed: 0 };
    const tt = timetable();
    if (!tt.covers(date)) {
        // Planning on an expired timetable would tell every rider "no buses". Stop and say why instead.
        if (warnedExpiredOn !== date) {
            warnedExpiredOn = date;
            console.error(`[Planner] The timetable runs ${tt.feed.start}–${tt.feed.end} and does not cover ${date}. Rebuild it: npm run build:timetable`);
            await emailAdmins('Timetable out of date: no SMS alerts today', `The SMS service's timetable covers ${tt.feed.start} to ${tt.feed.end}, so it can't plan trips for ${date}.\n\nDownload the current GTFS feed from Open Regina, run "npm run build:timetable" in services/sms, commit data/timetable.json and redeploy.`);
        }
        return result;
    }

    const schedules = must(await app().from('weekly_schedules')
        .select('id, user_id, arrive_by, depart_by, from_dest_id, to_dest_id')
        .eq('day_of_week', reginaWeekday(now)).eq('enabled', true), 'reading weekly_schedules') as Schedule[];
    if (!schedules.length) return result;

    const planned = new Set((await inChunks(schedules.map(s => s.id), async ids =>
        must(await sms().from('trip_plans').select('schedule_id').eq('service_date', date).in('schedule_id', ids), 'reading trip_plans') as { schedule_id: string }[]))
        .map(p => p.schedule_id));
    const todo = schedules.filter(s => {
        if (planned.has(s.id)) { result.alreadyPlanned++; return false; }
        const arrive = parseHhmm(s.arrive_by);
        if (arrive === null || arrive - TOO_LATE_MIN <= nowMin) { result.tooLate++; return false; }
        return true;
    });
    if (!todo.length) return result;

    const riders = [...new Set(todo.map(s => s.user_id))];
    const revoked = await smsRevoked(riders);
    const profiles = new Map((await inChunks(riders, async ids =>
        must(await app().from('profiles').select('id, mobile_number, sms_opted_in, mobile_verified, account_status').in('id', ids), 'reading profiles') as Profile[]))
        .map(p => [p.id, p]));
    const placeIds = [...new Set(todo.flatMap(s => [s.from_dest_id, s.to_dest_id]).filter((x): x is string => !!x))];
    const places = new Map((await inChunks(placeIds, async ids =>
        must(await app().from('saved_destinations').select('id, name, lat, lng').in('id', ids), 'reading saved_destinations') as Place[]))
        .map(p => [p.id, p]));

    const { dailyLimitMax } = config();
    for (const s of todo) {
        const p = profiles.get(s.user_id);
        const from = s.from_dest_id ? places.get(s.from_dest_id) : undefined;
        const to = s.to_dest_id ? places.get(s.to_dest_id) : undefined;
        if (!p?.sms_opted_in || revoked.has(s.user_id) || !p.mobile_verified || !p.mobile_number || (p.account_status ?? 'active') !== 'active' || !from || !to) { result.ineligible++; continue; }
        try {
            const plan = planArriveBy(tt, date, from, to, parseHhmm(s.arrive_by)!);
            const rows = buildPlan(tt, date, {
                scheduleId: s.id, userId: s.user_id, arriveBy: s.arrive_by.slice(0, 5), departBy: s.depart_by,
                originName: from.name, destinationName: to.name,
            }, plan, nowMin);
            const { data, error } = await sms().rpc('create_plan', { p_plan: rows.plan, p_legs: rows.legs, p_alerts: rows.alerts, p_daily_max: dailyLimitMax });
            if (error) throw new Error(error.message);
            if (data) result.planned++; else result.alreadyPlanned++;
        } catch (err) {
            result.failed++;
            console.error(`[Planner] Could not plan schedule ${s.id}:`, (err as Error).message);
        }
    }
    if (result.planned || result.failed) console.log(`[Planner] ${date}: ${result.planned} planned, ${result.failed} failed, ${result.alreadyPlanned} already planned, ${result.ineligible} not eligible, ${result.tooLate} too late`);
    return result;
}
