/**
 * The buses a rider chose in the app (its trip suggestion), found in the timetable: for each bus, the
 * next trip of that route from the boarding stop to the stop they get off at, after they can reach it.
 * The app and the timetable use the same GTFS stop ids.
 *
 * All times are minutes after midnight of the service day.
 */
import { Timetable } from './timetable';
import { Journey, Leg, LatLng } from './planner';
import { metresBetween, walkMinutes } from './geo';

export interface ChosenLeg { route: string; boardStopId: string; alightStopId: string }

const TRANSFER_BUFFER_MIN = 1;   // as in the planner: time to step off one bus and onto another

/** null when a stop or route is unknown, or no bus of that route runs again today */
export function journeyFor(tt: Timetable, date: string, chosen: ChosenLeg[], nowMin: number, origin: LatLng, destination: LatLng): Journey | null {
    const day = tt.day(date);
    const legs: Leg[] = [];
    let ready = nowMin;

    for (const [i, c] of chosen.entries()) {
        const board = tt.stopIndex(c.boardStopId), alight = tt.stopIndex(c.alightStopId);
        if (board === undefined || alight === undefined) return null;
        const prev = legs[i - 1];
        const walkBefore = i === 0
            ? walkMinutes(tt.metresToStop(board, origin.lat, origin.lng))
            : prev.alightStop === board ? 0 : walkMinutes(metresBetween(tt.lat[prev.alightStop], tt.lng[prev.alightStop], tt.lat[board], tt.lng[board]));
        const earliest = ready + walkBefore + (i === 0 ? 0 : TRANSFER_BUFFER_MIN);

        // The first trip of this route, on any of its patterns, that leaves the stop at or after `earliest`
        let best: Leg | null = null;
        for (const [p, boardPos] of tt.stopPatterns[board]) {
            const pattern = tt.patterns[p];
            if (pattern.route !== c.route) continue;
            const alightPos = pattern.stops.indexOf(alight, boardPos + 1);
            if (alightPos < 0) continue;
            const trip = day.trips[p].find(t => t[boardPos] >= earliest);
            if (trip && (!best || trip[boardPos] < best.boardMin)) {
                best = {
                    pattern: p, route: pattern.route, headsign: pattern.headsign, boardStop: board, alightStop: alight,
                    prevStop: pattern.stops[alightPos - 1], boardMin: trip[boardPos], alightMin: trip[alightPos], walkBeforeMin: walkBefore,
                };
            }
        }
        if (!best) return null;
        legs.push(best);
        ready = best.alightMin;
    }
    if (!legs.length) return null;

    const last = legs[legs.length - 1];
    const walkAfterMin = walkMinutes(tt.metresToStop(last.alightStop, destination.lat, destination.lng));
    return { legs, leaveMin: legs[0].boardMin - legs[0].walkBeforeMin, arriveMin: last.alightMin + walkAfterMin, walkAfterMin };
}
