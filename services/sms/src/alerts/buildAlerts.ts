/**
 * Turns a planned trip into the rows sms.create_plan stores: the plan, one leg per bus, and the
 * alerts. A trip with N buses gets N + 1 alerts: "leave now", then "get off at the next stop" per bus.
 * Partial and no-service days get one notice instead of "leave now".
 */
import { Timetable } from '../transit/timetable';
import { Journey, PlanResult } from '../transit/planner';
import { instantOf, parseHhmm } from '../time';

export const LEAVE_BUFFER_MIN = 3;    // "leave now" goes out 3 minutes before the rider must leave
export const ALIGHT_LEAD_MIN = 2;     // timetable fallback for "next stop": 2 minutes before the bus gets there
const NOTICE_DEFAULT_LEAD_MIN = 45;   // no plan and no saved departure time: tell them 45 min before arrival

export interface Commute {
    scheduleId: string;
    userId: string;
    arriveBy: string;           // "HH:MM"
    departBy: string | null;    // the rider's usual departure, "HH:MM", if saved
    originName: string | null;
    destinationName: string | null;
}

export interface LegRow {
    seq: number; route_num: string; headsign: string; board_stop_id: string; alight_stop_id: string; prev_stop_id: string;
    walk_before_min: number; sched_board_at: string; sched_alight_at: string;
}
export interface AlertRow { kind: 'leave_now' | 'alight' | 'notice'; due_at: string; leg_seq: number | null; key: string }
export interface PlanRow {
    schedule_id: string; user_id: string; service_date: string; arrive_by: string;
    status: 'planned' | 'partial' | 'no_service'; origin_name: string | null; destination_name: string | null;
    leave_at: string | null; arrive_at: string | null; notice: Record<string, unknown>;
}

function legRows(tt: Timetable, date: string, journey: Journey): LegRow[] {
    return journey.legs.map((l, i) => ({
        seq: i + 1, route_num: l.route, headsign: l.headsign,
        board_stop_id: tt.stopIds[l.boardStop], alight_stop_id: tt.stopIds[l.alightStop], prev_stop_id: tt.stopIds[l.prevStop],
        walk_before_min: l.walkBeforeMin,
        sched_board_at: instantOf(date, l.boardMin).toISOString(), sched_alight_at: instantOf(date, l.alightMin).toISOString(),
    }));
}

/** "Get off at the next stop" for every leg, timed from the timetable until a live bus is matched */
function alightAlerts(date: string, journey: Journey): AlertRow[] {
    return journey.legs.map((l, i) => ({
        kind: 'alight' as const, leg_seq: i + 1, key: `leg${i + 1}:alight`,
        due_at: instantOf(date, Math.max(l.alightMin - ALIGHT_LEAD_MIN, l.boardMin + 1)).toISOString(),
    }));
}

/** Never schedule a text in the past: one that is late goes out now */
const notBefore = (date: string, minutes: number, nowMin: number) => instantOf(date, Math.max(minutes, nowMin)).toISOString();

export function buildPlan(tt: Timetable, date: string, c: Commute, result: PlanResult, nowMin: number) {
    const base = { schedule_id: c.scheduleId, user_id: c.userId, service_date: date, arrive_by: c.arriveBy, origin_name: c.originName, destination_name: c.destinationName };

    if (result.status === 'no_service') {
        const usual = parseHhmm(c.departBy) ?? (parseHhmm(c.arriveBy) ?? 0) - NOTICE_DEFAULT_LEAD_MIN;
        const e = result.earliest;
        const dueMin = Math.min(usual, e ? e.leaveMin - LEAVE_BUFFER_MIN : usual);
        const plan: PlanRow = {
            ...base, status: 'no_service', leave_at: null, arrive_at: null,
            notice: e ? { earliest: { leaveAt: instantOf(date, e.leaveMin).toISOString(), arriveAt: instantOf(date, e.arriveMin).toISOString(), route: e.legs[0].route } } : {},
        };
        return { plan, legs: [] as LegRow[], alerts: [{ kind: 'notice', due_at: notBefore(date, dueMin, nowMin), leg_seq: null, key: 'notice' }] as AlertRow[] };
    }

    const j = result.journey;
    const lastLeg = j.legs[j.legs.length - 1];
    const plan: PlanRow = {
        ...base, status: result.status,
        leave_at: instantOf(date, j.leaveMin).toISOString(), arrive_at: instantOf(date, j.arriveMin).toISOString(),
        notice: result.status === 'partial'
            ? { walkAfterMin: j.walkAfterMin, remainingMetres: result.remainingMetres, lastStopId: tt.stopIds[lastLeg.alightStop] }
            : { walkAfterMin: j.walkAfterMin },
    };
    const first: AlertRow = result.status === 'partial'
        ? { kind: 'notice', due_at: notBefore(date, j.leaveMin - LEAVE_BUFFER_MIN, nowMin), leg_seq: null, key: 'notice' }
        : { kind: 'leave_now', due_at: notBefore(date, j.leaveMin - LEAVE_BUFFER_MIN, nowMin), leg_seq: 1, key: 'leave_now' };
    return { plan, legs: legRows(tt, date, j), alerts: [first, ...alightAlerts(date, j)] };
}
