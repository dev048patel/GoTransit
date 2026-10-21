/**
 * Trip planning on the timetable with RAPTOR (round-based public transit routing): round 1 finds
 * every stop reachable on one bus, round 2 with one transfer, and so on. On top of it, planArriveBy
 * finds the latest trip that still arrives by the rider's time (the daily planner).
 *
 * All times are minutes after midnight of the service day.
 */
import { Timetable, ServiceDay } from './timetable';
import { metresBetween } from './geo';

export const MAX_LEGS = 3;              // at most two transfers
const ACCESS_METRES = 1000;             // furthest walk to the first stop or from the last one
const ACCESS_METRES_FALLBACK = 1600;    // when nothing is within ACCESS_METRES
const WINDOW_MIN = 150;                 // look for trips leaving up to 2.5 h before the arrival time
const TRANSFER_BUFFER_MIN = 1;          // time to step off one bus and onto another at the same stop
const EXTRA_LEG_PENALTY_MIN = 10;       // a direct bus beats a transfer that leaves up to 10 min later
const PARTIAL_MIN_GAIN_METRES = 500;    // a partial trip must get the rider at least this much closer

export interface LatLng { lat: number; lng: number }

export interface Leg {
    pattern: number;
    route: string;
    headsign: string;
    boardStop: number;
    alightStop: number;
    /** the stop before alightStop on this bus, where "get off at the next stop" is sent (may be boardStop) */
    prevStop: number;
    boardMin: number;
    alightMin: number;
    /** walk before boarding: from the origin for the first leg, from the last bus for a transfer */
    walkBeforeMin: number;
}

export interface Journey {
    legs: Leg[];
    /** when to leave the origin */
    leaveMin: number;
    /** when the rider reaches the destination, walk included */
    arriveMin: number;
    /** the walk after the last bus */
    walkAfterMin: number;
}

export type PlanResult =
    | { status: 'planned'; journey: Journey }
    | { status: 'partial'; journey: Journey; remainingMetres: number }
    | { status: 'no_service'; earliest: Journey | null };

type Access = [stop: number, minutes: number][];

type RideLabel = { pattern: number; times: number[]; boardPos: number; alightPos: number };
type ArrLabel = { kind: 'access'; walk: number } | { kind: 'ride' } | { kind: 'walk'; from: number; minutes: number };

interface Rounds {
    ride: Float64Array[];
    rideLab: (RideLabel | undefined)[][];
    arr: Float64Array[];
    arrLab: (ArrLabel | undefined)[][];
}

/** The first trip (index) leaving position `pos` at or after `t`. Trips on one pattern don't overtake. */
function firstTripFrom(trips: number[][], pos: number, t: number): number {
    let lo = 0, hi = trips.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (trips[mid][pos] < t) lo = mid + 1; else hi = mid;
    }
    return lo;
}

function raptor(tt: Timetable, day: ServiceDay, access: Access, departMin: number): Rounds {
    const n = tt.stopIds.length;
    const r: Rounds = { ride: [], rideLab: [], arr: [], arrLab: [] };
    for (let k = 0; k <= MAX_LEGS; k++) {
        r.ride.push(new Float64Array(n).fill(Infinity));
        r.arr.push(new Float64Array(n).fill(Infinity));
        r.rideLab.push([]);
        r.arrLab.push([]);
    }
    const best = new Float64Array(n).fill(Infinity);

    let marked = new Set<number>();
    for (const [s, walk] of access) {
        const t = departMin + walk;
        if (t < r.arr[0][s]) { r.arr[0][s] = t; r.arrLab[0][s] = { kind: 'access', walk }; best[s] = t; marked.add(s); }
    }

    for (let k = 1; k <= MAX_LEGS && marked.size; k++) {
        // the patterns through stops reached last round, scanned from the earliest such stop
        const queue = new Map<number, number>();
        for (const s of marked) {
            for (const [p, pos] of tt.stopPatterns[s]) {
                if (pos < tt.patterns[p].stops.length - 1 && pos < (queue.get(p) ?? Infinity)) queue.set(p, pos);
            }
        }
        const reached = new Set<number>();
        const prevArr = r.arr[k - 1], prevLab = r.arrLab[k - 1];

        for (const [p, startPos] of queue) {
            const trips = day.trips[p];
            if (!trips.length) continue;
            const stops = tt.patterns[p].stops;
            let cur: number[] | null = null, boardPos = -1;
            for (let pos = startPos; pos < stops.length; pos++) {
                const s = stops[pos];
                if (cur) {
                    const t = cur[pos];
                    if (t < best[s] && t < r.ride[k][s]) {
                        r.ride[k][s] = t; best[s] = t;
                        r.rideLab[k][s] = { pattern: p, times: cur, boardPos, alightPos: pos };
                        reached.add(s);
                    }
                }
                const ready = prevArr[s];
                if (ready < Infinity && pos < stops.length - 1) {
                    const need = ready + (prevLab[s]?.kind === 'ride' ? TRANSFER_BUFFER_MIN : 0);
                    if (!cur || need < cur[pos]) {
                        const j = firstTripFrom(trips, pos, need);
                        if (j < trips.length && (!cur || trips[j][pos] < cur[pos])) { cur = trips[j]; boardPos = pos; }
                    }
                }
            }
        }

        // arriving by bus, then walking to nearby stops for a transfer
        for (const s of reached) { r.arr[k][s] = r.ride[k][s]; r.arrLab[k][s] = { kind: 'ride' }; }
        const next = new Set(reached);
        for (const s of reached) {
            for (const [to, minutes] of tt.footpaths[s]) {
                const t = r.ride[k][s] + minutes;
                if (t < r.arr[k][to] && t < best[to]) {
                    r.arr[k][to] = t; best[to] = t;
                    r.arrLab[k][to] = { kind: 'walk', from: s, minutes };
                    next.add(to);
                }
            }
        }
        marked = next;
    }
    return r;
}

/** The legs of the journey that ends by bus at `stop` in round `k` */
function legsTo(tt: Timetable, r: Rounds, k: number, stop: number): Leg[] {
    const legs: Leg[] = [];
    let lab = r.rideLab[k][stop];
    let round = k;
    while (lab) {
        const p = tt.patterns[lab.pattern];
        const leg: Leg = {
            pattern: lab.pattern, route: p.route, headsign: p.headsign,
            boardStop: p.stops[lab.boardPos], alightStop: p.stops[lab.alightPos],
            prevStop: p.stops[lab.alightPos - 1],
            boardMin: lab.times[lab.boardPos], alightMin: lab.times[lab.alightPos], walkBeforeMin: 0,
        };
        legs.unshift(leg);
        round--;
        const before = r.arrLab[round][leg.boardStop];
        if (!before || before.kind === 'access') { leg.walkBeforeMin = before?.walk ?? 0; break; }
        if (before.kind === 'walk') { leg.walkBeforeMin = before.minutes; lab = r.rideLab[round][before.from]; }
        else lab = r.rideLab[round][leg.boardStop];
    }
    return legs;
}

function journeyOf(legs: Leg[], walkAfterMin: number): Journey {
    return { legs, leaveMin: legs[0].boardMin - legs[0].walkBeforeMin, arriveMin: legs[legs.length - 1].alightMin + walkAfterMin, walkAfterMin };
}

/** The best journey of each round (1 bus, 2 buses, …) to the egress stops */
function journeysByRound(tt: Timetable, r: Rounds, egress: Access): Journey[] {
    const out: Journey[] = [];
    for (let k = 1; k <= MAX_LEGS; k++) {
        let bestT = Infinity, bestStop = -1, bestWalk = 0;
        for (const [s, walk] of egress) {
            const t = r.ride[k][s] + walk;
            if (t < bestT) { bestT = t; bestStop = s; bestWalk = walk; }
        }
        if (bestStop >= 0) out.push(journeyOf(legsTo(tt, r, k, bestStop), bestWalk));
    }
    return out;
}

const score = (j: Journey) => j.leaveMin - EXTRA_LEG_PENALTY_MIN * (j.legs.length - 1);

/** Prefer leaving later; a transfer must leave EXTRA_LEG_PENALTY_MIN later to beat a direct bus. */
function better(a: Journey, b: Journey | null): boolean {
    if (!b) return true;
    return score(a) > score(b) || (score(a) === score(b) && (a.legs.length < b.legs.length || a.arriveMin < b.arriveMin));
}

/** The latest-leaving journey that arrives by `arriveByMin` */
function latestArrivingBy(tt: Timetable, day: ServiceDay, access: Access, egress: Access, arriveByMin: number): Journey | null {
    let chosen: Journey | null = null;
    let depart = arriveByMin - WINDOW_MIN;
    for (let i = 0; i < 80 && depart <= arriveByMin; i++) {
        const onTime = journeysByRound(tt, raptor(tt, day, access, depart), egress).filter(j => j.arriveMin <= arriveByMin);
        if (!onTime.length) break;
        for (const j of onTime) if (better(j, chosen)) chosen = j;
        // try again leaving just after the latest of these, until nothing arrives in time
        depart = Math.max(depart + 1, Math.max(...onTime.map(j => j.leaveMin)) + 1);
    }
    return chosen;
}

function earliestOf(journeys: Journey[]): Journey | null {
    let pick: Journey | null = null;
    for (const j of journeys) {
        // fewer buses win when they arrive within 5 minutes of the fastest
        if (!pick || j.arriveMin < pick.arriveMin - 5 || (Math.abs(j.arriveMin - pick.arriveMin) <= 5 && j.legs.length < pick.legs.length)) pick = j;
    }
    return pick;
}

function accessFrom(tt: Timetable, place: LatLng): Access {
    let near = tt.nearbyStops(place.lat, place.lng, ACCESS_METRES);
    if (!near.length) near = tt.nearbyStops(place.lat, place.lng, ACCESS_METRES_FALLBACK);
    return near.map(s => [s.stop, s.minutes]);
}

/** The daily planner's question: how does the rider get from `origin` to `destination` by `arriveByMin`? */
export function planArriveBy(tt: Timetable, date: string, origin: LatLng, destination: LatLng, arriveByMin: number): PlanResult {
    const day = tt.day(date);
    const access = accessFrom(tt, origin), egress = accessFrom(tt, destination);

    const onTime = egress.length && access.length ? latestArrivingBy(tt, day, access, egress, arriveByMin) : null;
    if (onTime) return { status: 'planned', journey: onTime };
    if (!access.length) return { status: 'no_service', earliest: null };

    const rounds = raptor(tt, day, access, arriveByMin - WINDOW_MIN);

    // Part of the way: the stop reachable by bus in time that is closest to the destination
    const fromOrigin = metresBetween(origin.lat, origin.lng, destination.lat, destination.lng);
    let closest = -1, closestMetres = Infinity;
    for (let k = 1; k <= MAX_LEGS; k++) {
        for (let s = 0; s < tt.stopIds.length; s++) {
            if (rounds.ride[k][s] > arriveByMin) continue;
            const m = tt.metresToStop(s, destination.lat, destination.lng);
            if (m < closestMetres) { closestMetres = m; closest = s; }
        }
    }
    if (closest >= 0 && closestMetres < fromOrigin - PARTIAL_MIN_GAIN_METRES && closestMetres < fromOrigin * 0.7) {
        const partial = latestArrivingBy(tt, day, access, [[closest, 0]], arriveByMin);
        if (partial) return { status: 'partial', journey: partial, remainingMetres: Math.round(closestMetres) };
    }

    // Nothing in time: say when the rider could get there instead
    const late = egress.length ? earliestOf(journeysByRound(tt, rounds, egress)) : null;
    const earliest = late ? latestArrivingBy(tt, day, access, egress, late.arriveMin) ?? late : null;
    return { status: 'no_service', earliest };
}
