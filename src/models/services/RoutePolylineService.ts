/*
 RoutePolylineService
 Loads per-route polyline snapshots from src/newData/polyline_data/.
 File format: { type: "LineString", coordinates: [[lat, lng], ...], style: {...} }

 Each file is one closed loop: the bus's full round trip, out on one carriageway and back on the
 other. That makes it the most accurate source for drawing a single ride, see getRidePath.
*/
import transitStops from '../data/transitStops';
import { STOP_DIRECTION_HEADING } from '../transit/StopDirection';
import { bearingBetween, distanceMeters, getStopDirection } from './StopDirectionIndex';
import { checkStopDirection, getStopsForRoute } from './StopToRouteIndex';

interface RoutePolylineFile {
    type: 'LineString';
    coordinates: [number, number][]; // [lat, lng]
    style?: { color?: string; opacity?: number; clickable?: string | boolean };
}

type LatLng = { lat: number; lng: number };

// Vite eagerly bundles every route_*_polyline.json file at build time.
const polylineFiles = import.meta.glob<RoutePolylineFile>(
    '../../newData/polyline_data/route_*_polyline.json',
    { eager: true, import: 'default' }
);

const routePolylineMap: Map<string, RoutePolylineFile> = (() => {
    const map = new Map<string, RoutePolylineFile>();
    for (const [path, data] of Object.entries(polylineFiles)) {
        const match = path.match(/route_(\d+)_polyline\.json$/);
        if (match) map.set(match[1], data);
    }
    return map;
})();

// A stretch of the line counts as passing a stop when it runs this close to it...
const STOP_TO_LINE_MAX_M = 40;
// ...and heads within this of the stop's direction, which tells the two carriageways apart
const HEADING_TOLERANCE_DEG = 60;
// A ride over more of the round trip than this is no real suggestion: the stops were matched wrongly
const MAX_RIDE_SHARE_OF_LOOP = 0.6;
// Roads curve, so a drawn ride runs longer than the stop-to-stop distance (typically 1.0–1.4×). Far
// outside that, the loop doesn't follow the route there (a detour or variant in the snapshot).
const MAX_RIDE_LENGTH_RATIO = 1.6, MIN_RIDE_LENGTH_RATIO = 0.7, RIDE_LENGTH_SLACK_M = 400;

/** A route's loop in driving order, with cumulative distance (metres) at each point. */
interface RouteLoop {
    points: LatLng[];
    cumulative: number[];
    closed: boolean; // last point is the first point: rides may wrap past the end of the file
}

/** Where a stretch of the loop passes a stop: segment index, fraction along it, and distance along the loop. */
interface Pass { segment: number; t: number; position: number; distance: number }

const loopCache = new Map<string, RouteLoop | null>();
const stopById = new Map(transitStops.map(s => [s.STOP_ID, s]));

function angleDifference(a: number, b: number): number {
    const diff = Math.abs(a - b) % 360;
    return diff > 180 ? 360 - diff : diff;
}

/** Distance (metres) from p to segment a–b and the fraction t along it of the nearest point. */
function projectOntoSegment(p: LatLng, a: LatLng, b: LatLng): { distance: number; t: number } {
    const mPerLat = 111320;
    const mPerLng = 111320 * Math.cos(p.lat * Math.PI / 180);
    const ax = (a.lng - p.lng) * mPerLng, ay = (a.lat - p.lat) * mPerLat;
    const bx = (b.lng - p.lng) * mPerLng, by = (b.lat - p.lat) * mPerLat;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    return { distance: Math.hypot(ax + t * dx, ay + t * dy), t };
}

/**
 * Every place the line passes a stop, one entry per pass (the line can pass a stop more than once).
 * With a heading, only stretches travelling that way count; reversed reads the line backwards.
 */
function findPasses(points: LatLng[], cumulative: number[], stop: LatLng, heading: number | null, reversed = false): Pass[] {
    const passes: Pass[] = [];
    let lastSegment = -2;
    for (let i = 0; i < points.length - 1; i++) {
        const { distance, t } = projectOntoSegment(stop, points[i], points[i + 1]);
        if (distance > STOP_TO_LINE_MAX_M) continue;
        if (heading !== null) {
            const bearing = reversed ? bearingBetween(points[i + 1], points[i]) : bearingBetween(points[i], points[i + 1]);
            if (angleDifference(bearing, heading) > HEADING_TOLERANCE_DEG) continue;
        }
        const position = cumulative[i] + t * (cumulative[i + 1] - cumulative[i]);
        const pass = { segment: i, t, position, distance };
        // Consecutive segments are the same pass: keep the closest
        if (i === lastSegment + 1 && passes.length > 0) {
            if (distance < passes[passes.length - 1].distance) passes[passes.length - 1] = pass;
        } else {
            passes.push(pass);
        }
        lastSegment = i;
    }
    return passes;
}

function stopLocationAndHeading(stopId: string): { location: LatLng; heading: number | null } | null {
    const stop = stopById.get(stopId);
    if (!stop) return null;
    const direction = getStopDirection(stopId);
    return {
        location: { lat: parseFloat(stop.LAT), lng: parseFloat(stop.LON) },
        heading: direction ? STOP_DIRECTION_HEADING[direction] : null,
    };
}

function cumulativeDistances(points: LatLng[]): number[] {
    const cumulative = [0];
    for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + distanceMeters(points[i - 1], points[i]));
    return cumulative;
}

/**
 * The route's loop in driving order. Most files are stored that way, but not all (Route 8 runs
 * backwards), so the order is checked against the route's stops: in driving order, the line passes
 * each stop heading the stop's direction.
 */
function getRouteLoop(routeNum: string): RouteLoop | null {
    if (loopCache.has(routeNum)) return loopCache.get(routeNum)!;

    const data = routePolylineMap.get(routeNum);
    let loop: RouteLoop | null = null;
    if (data?.coordinates && data.coordinates.length >= 2) {
        let points = data.coordinates.map(([lat, lng]) => ({ lat, lng }));
        const cumulative = cumulativeDistances(points);

        let forward = 0, backward = 0;
        for (const stopId of getStopsForRoute(routeNum)) {
            const stop = stopLocationAndHeading(stopId);
            if (!stop || stop.heading === null) continue;
            if (findPasses(points, cumulative, stop.location, stop.heading).length > 0) forward++;
            if (findPasses(points, cumulative, stop.location, stop.heading, true).length > 0) backward++;
        }
        if (backward > forward) points = points.reverse();

        loop = {
            points,
            cumulative: backward > forward ? cumulativeDistances(points) : cumulative,
            closed: distanceMeters(points[0], points[points.length - 1]) < 1,
        };
    }
    loopCache.set(routeNum, loop);
    return loop;
}

export class RoutePolylineService {
    /**
     * Returns the polyline as a single path (array of {lat,lng}) wrapped in an array
     * for compatibility with consumers that expect multiple lines (e.g. MultiLineString).
     */
    static getRoutePaths(routeNum: string): { lat: number; lng: number }[][] {
        const data = routePolylineMap.get(routeNum);
        if (!data || !data.coordinates) return [];
        const path = data.coordinates.map(([lat, lng]) => ({ lat, lng }));
        return path.length >= 2 ? [path] : [];
    }

    /**
     * The road the bus takes between two stops, cut from the route's loop: on the carriageway the
     * bus actually uses (matched by the stops' directions), and round any turnaround at the end of
     * the line. Null when the loop doesn't clearly pass both stops, so the caller can fall back.
     */
    static getRidePath(routeNum: string, fromStopId: string, toStopId: string): LatLng[] | null {
        const loop = getRouteLoop(routeNum);
        const from = stopLocationAndHeading(fromStopId);
        const to = stopLocationAndHeading(toStopId);
        if (!loop || !from || !to) return null;

        const { points, cumulative, closed } = loop;
        const loopLength = cumulative[cumulative.length - 1];
        const boardings = findPasses(points, cumulative, from.location, from.heading);
        const alightings = findPasses(points, cumulative, to.location, to.heading);

        // Shortest ride forward along the loop from a boarding pass to an alighting pass
        let best: { board: Pass; alight: Pass; length: number } | null = null;
        for (const board of boardings) {
            for (const alight of alightings) {
                let length = alight.position - board.position;
                if (length <= 0) {
                    if (!closed) continue;
                    length += loopLength; // round past the end of the file to the start
                }
                if (!best || length < best.length) best = { board, alight, length };
            }
        }
        if (!best || best.length > loopLength * MAX_RIDE_SHARE_OF_LOOP) return null;

        // Cross-check against the bus's stop-by-stop distance for this ride
        const expected = checkStopDirection(routeNum, fromStopId, toStopId);
        if (expected?.valid && (
            best.length > expected.shapeDistance * MAX_RIDE_LENGTH_RATIO + RIDE_LENGTH_SLACK_M ||
            best.length < expected.shapeDistance * MIN_RIDE_LENGTH_RATIO - RIDE_LENGTH_SLACK_M
        )) return null;

        const pointAt = ({ segment, t }: Pass): LatLng => ({
            lat: points[segment].lat + t * (points[segment + 1].lat - points[segment].lat),
            lng: points[segment].lng + t * (points[segment + 1].lng - points[segment].lng),
        });

        // A closed loop's last point repeats its first, so it has one point fewer to walk round
        const ring = closed ? points.length - 1 : points.length;
        const wraps = best.alight.position <= best.board.position;
        const steps = wraps ? ring - best.board.segment + best.alight.segment : best.alight.segment - best.board.segment;

        const path = [pointAt(best.board)];
        for (let s = 1; s <= steps; s++) path.push(points[(best.board.segment + s) % ring]);
        path.push(pointAt(best.alight));
        return path;
    }
}
