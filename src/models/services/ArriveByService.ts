/*
 "Arrive by" trip planning on the bus timetable: the latest bus (or buses) that still gets the rider to
 their destination by the time they picked.

 It reuses the SMS service's timetable and planner (services/sms/src/transit), which plan riders' saved
 commutes the same way and are tested there. They are plain modules that only read
 services/sms/data/timetable.json, so this works whether or not the SMS service is running.
*/
import { timetable } from '../../../services/sms/src/transit/timetable';
import { planArriveBy, type Journey } from '../../../services/sms/src/transit/planner';
import { addDays, clock, reginaDate, reginaMinutes } from '../../../services/sms/src/time';

export interface PlannedStop { id: string; name: string }

export interface PlannedLeg {
    route: string;
    headsign: string;
    boardStop: PlannedStop;
    alightStop: PlannedStop;
    board: string;            // "1:58 PM"
    alight: string;
    rideMin: number;
    walkBeforeMin: number;    // to this bus: from the start for the first, between buses for a transfer
}

export interface PlannedJourney {
    leave: string;            // when to set off on foot
    arrive: string;           // at the destination, final walk included
    walkAfterMin: number;
    legs: PlannedLeg[];
}

export type ArriveByPlan =
    /** journeys: the latest that arrives in time first, then earlier ones as backups */
    | { status: 'planned'; day: 'today' | 'tomorrow'; arriveBy: string; journeys: PlannedJourney[] }
    | { status: 'partial'; day: 'today' | 'tomorrow'; arriveBy: string; journey: PlannedJourney; remainingMetres: number }
    | { status: 'no_service'; day: 'today' | 'tomorrow'; arriveBy: string; earliest: PlannedJourney | null };

export interface LatLng { lat: number; lng: number }

/** How many trips to offer: the latest that makes it, and earlier ones in case the rider misses it */
const MAX_OPTIONS = 3;

function describe(j: Journey): PlannedJourney {
    const tt = timetable();
    const stop = (i: number): PlannedStop => ({ id: tt.stopIds[i], name: tt.names[i] });
    return {
        leave: clock(j.leaveMin),
        arrive: clock(j.arriveMin),
        walkAfterMin: j.walkAfterMin,
        legs: j.legs.map(l => ({
            route: l.route,
            headsign: l.headsign,
            boardStop: stop(l.boardStop),
            alightStop: stop(l.alightStop),
            board: clock(l.boardMin),
            alight: clock(l.alightMin),
            rideMin: Math.round(l.alightMin - l.boardMin),
            walkBeforeMin: l.walkBeforeMin,
        })),
    };
}

export class ArriveByService {
    /**
     * Plan to arrive by `arriveByMin` (minutes after midnight, Regina time). A time that has already
     * passed today is taken as tomorrow, so "8:00" asked in the evening plans tomorrow morning.
     */
    static plan(origin: LatLng, destination: LatLng, arriveByMin: number, now: Date = new Date()): ArriveByPlan {
        const tomorrow = arriveByMin <= reginaMinutes(now);
        const day = tomorrow ? 'tomorrow' : 'today';
        const date = tomorrow ? addDays(reginaDate(now), 1) : reginaDate(now);
        const arriveBy = clock(arriveByMin);
        const r = planArriveBy(timetable(), date, origin, destination, arriveByMin);
        if (r.status === 'planned') {
            // Each further option is the latest trip arriving before the one already found
            const found = [r.journey];
            while (found.length < MAX_OPTIONS) {
                const next = planArriveBy(timetable(), date, origin, destination, found[found.length - 1].arriveMin - 1);
                if (next.status !== 'planned') break;
                found.push(next.journey);
            }
            return { status: 'planned', day, arriveBy, journeys: found.map(describe) };
        }
        if (r.status === 'partial') return { status: 'partial', day, arriveBy, journey: describe(r.journey), remainingMetres: r.remainingMetres };
        return { status: 'no_service', day, arriveBy, earliest: r.earliest ? describe(r.earliest) : null };
    }
}
