/**
 * Writes an alert's text at the moment it is sent, from the plan and legs as they are then, so a
 * live time or a re-plan made after the morning is what the rider reads.
 */
import { Timetable } from '../transit/timetable';
import { AlertDb, LegDb, PlanDb } from '../types';
import { LegText, alightText, leaveNowText, noServiceText, partialAlightText, partialText } from './messages';

export function legText(tt: Timetable, leg: LegDb): LegText {
    const name = (id: string) => { const i = tt.stopIndex(id); return i === undefined ? `stop ${id}` : tt.names[i]; };
    return {
        route: leg.route_num, boardName: name(leg.board_stop_id), alightName: name(leg.alight_stop_id),
        walkBeforeMin: leg.walk_before_min, boardAt: leg.live_board_at ?? leg.sched_board_at, live: !!leg.bus_id,
    };
}

/** `legs`: the plan's active legs, in order */
export function renderAlert(tt: Timetable, plan: PlanDb, legs: LegDb[], alert: AlertDb): string {
    const notice = plan.notice ?? {};
    const stopName = (id: string | undefined) => { const i = id === undefined ? undefined : tt.stopIndex(id); return i === undefined ? 'your stop' : tt.names[i]; };

    switch (alert.kind) {
        case 'leave_now':
            return leaveNowText(legText(tt, legs[0]));

        case 'alight': {
            const i = legs.findIndex(l => l.id === alert.leg_id);
            if (i < 0) throw new Error(`alert ${alert.id}: its leg is no longer part of the plan`);
            const leg = legs[i], next = legs[i + 1] ?? null;
            const live = !!leg.bus_id && !!leg.live_alight_at;
            if (!next && plan.status === 'partial') return partialAlightText(legText(tt, leg), notice.remainingMetres ?? 0, live);
            return alightText(legText(tt, leg), next && legText(tt, next), notice.walkAfterMin ?? 0, plan.arrive_at ?? leg.sched_alight_at, live);
        }

        case 'notice':
            if (plan.status === 'no_service' || !legs.length) return noServiceText(plan.arrive_by, notice.earliest ?? null);
            return partialText(legText(tt, legs[0]), stopName(notice.lastStopId), legs[legs.length - 1].sched_alight_at, notice.remainingMetres ?? 0);
    }
}
