// /**
//  * StopToRouteIndex — maps each bus stop to the routes that serve it,
//  * by checking proximity of every stop to each route's shape geometry.
//  */
import transitStops from '../data/transitStops';
import transitShapesData from '../data/transitShapes.json';
import gtfsStopRoutes from '../data/gtfsStopRoutes.json';
import gtfsDirectionalShapes from '../data/gtfsDirectionalShapes.json';
import gtfsStopSequences from '../data/gtfsStopSequences.json';
import { ShapeFeature } from '../transit/ShapeFeature';
import { checkCompassDirection } from './StopDirectionIndex';

// Singleton index
let stopToRoutes: Map<string, Set<string>> | null = null;
let routeToStops: Map<string, Set<string>> | null = null;
let routeShapesCache: Map<string, number[][][]> | null = null;
// Per-direction GTFS shapes: key = "routeNum-dir", value = [lng,lat][] (projection-ready)
let gtfsDirCache: Map<string, number[][]> | null = null;
// Per-direction GTFS stop sequences: key = "routeNum-dir", value = ordered stop ID array
let gtfsSeqCache: Map<string, string[]> | null = null;
// Cumulative distance (metres) along each stop sequence: same keys/indices as gtfsSeqCache
let gtfsSeqDistCache: Map<string, number[]> | null = null;
// Stop ID → stop, for O(1) lookups on hot paths
let stopById: Map<string, (typeof transitStops)[number]> | null = null;
// Memoized checkStopDirection results: key = "routeNum|stopA|stopB" (inputs are static data)
const directionCheckCache = new Map<string, { valid: boolean; shapeDistance: number } | null>();

// A bus that reaches the end of the line turns round and comes back as the other direction's trip.
// Riding through that turnaround is offered only when boarding this close to the end, so a rider
// is never told to ride a whole route out and back (e.g. Route 3 looping round Sask Polytechnic).
const TERMINUS_RIDE_THROUGH_MAX_METERS = 3000;

const PROXIMITY_THRESHOLD_METERS = 65; // Stop must be within 65m of shape line for projection
// (40m was too tight — directional shapes for NB/SB routes are on opposite sides of the road,
// and stops offset from centerline can land 50-60m from the 'wrong' direction's shape)

/**
 * Calculate distance in meters between two lat/lng points using Haversine formula.
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number { // assuming lat and lon are in degree
    const earthRadius = 6371e3;

    // converting coordinates to radians 
    const radLat1 = lat1 * Math.PI / 180;
    const radLat2 = lat2 * Math.PI / 180;

    // computing difference between latitude and longitude
    const differenceLat = (lat2 - lat1) * Math.PI / 180;
    const differenceLon = (lon2 - lon1) * Math.PI / 180;

    // finding 
    const a = Math.sin(differenceLat / 2) * Math.sin(differenceLat / 2) +
        (Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(differenceLon / 2) * Math.sin(differenceLon / 2));

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // multiplying with earth radius to get answer in meters
    return earthRadius * c;
}

/**
 * Calculate minimum distance from point P to line segment AB.
 * All inputs in lat/lng degrees. Returns distance in meters.
 * Uses projection onto the segment in a local flat-Earth approximation for speed.
 */
function pointToSegmentDistance(
    pLat: number, pLon: number,
    aLat: number, aLon: number,
    bLat: number, bLon: number
): number {
    // Convert to flat-earth approximation (meters) centered at point A
    const cosLat = Math.cos(aLat * Math.PI / 180);
    const mPerDegLat = 111320; // meters per degree latitude
    const mPerDegLon = 111320 * cosLat; // meters per degree longitude at this latitude

    const px = (pLon - aLon) * mPerDegLon;
    const py = (pLat - aLat) * mPerDegLat;
    const bx = (bLon - aLon) * mPerDegLon;
    const by = (bLat - aLat) * mPerDegLat;

    // Project P onto AB
    const abLenSq = bx * bx + by * by;
    if (abLenSq === 0) {
        // A and B are the same point
        return Math.sqrt(px * px + py * py);
    }

    let t = (px * bx + py * by) / abLenSq;
    t = Math.max(0, Math.min(1, t)); // Clamp to segment

    const closestX = t * bx;
    const closestY = t * by;

    const dx = px - closestX;
    const dy = py - closestY;

    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a stop is within the threshold distance of any segment in a route's shape.
 * Uses early termination for efficiency.
 */
function isStopNearRoute(
    stopLat: number, stopLon: number,
    coordinates: number[][][],
    threshold: number
): boolean {
    for (const line of coordinates) {
        for (let i = 0; i < line.length - 1; i++) {
            const [aLon, aLat] = line[i];     // GeoJSON is [lng, lat]
            const [bLon, bLat] = line[i + 1];

            // Quick bounding-box pre-filter: skip segment if stop is far away
            const minLat = Math.min(aLat, bLat);
            const maxLat = Math.max(aLat, bLat);
            const minLon = Math.min(aLon, bLon);
            const maxLon = Math.max(aLon, bLon);

            // ~0.002 degrees ≈ 220m buffer
            const buffer = 0.002;
            if (stopLat < minLat - buffer || stopLat > maxLat + buffer ||
                stopLon < minLon - buffer || stopLon > maxLon + buffer) {
                continue;
            }

            const dist = pointToSegmentDistance(stopLat, stopLon, aLat, aLon, bLat, bLon);
            if (dist <= threshold) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Project a stop onto a SINGLE shape line and return its cumulative distance along that line.
 * Returns -1 if the stop is not near the line.
 */
function projectStopOntoLine(
    stopLat: number, stopLon: number,
    line: number[][]
): { position: number; distance: number } {
    let bestDist = Infinity;
    let bestPosition = -1;

    let cumulativeDistance = 0;

    for (let i = 0; i < line.length - 1; i++) {
        const [aLon, aLat] = line[i];
        const [bLon, bLat] = line[i + 1];

        const segLen = haversineDistance(aLat, aLon, bLat, bLon);
        const dist = pointToSegmentDistance(stopLat, stopLon, aLat, aLon, bLat, bLon);

        if (dist < bestDist && dist <= PROXIMITY_THRESHOLD_METERS) {
            bestDist = dist;
            const cosLat = Math.cos(aLat * Math.PI / 180);
            const mPerDegLat = 111320;
            const mPerDegLon = 111320 * cosLat;
            const px = (stopLon - aLon) * mPerDegLon;
            const py = (stopLat - aLat) * mPerDegLat;
            const bx = (bLon - aLon) * mPerDegLon;
            const by = (bLat - aLat) * mPerDegLat;
            const abLenSq = bx * bx + by * by;
            const t = abLenSq === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / abLenSq));
            bestPosition = cumulativeDistance + t * segLen;
        }

        cumulativeDistance += segLen;
    }

    return { position: bestPosition, distance: bestDist };
}

/**
 * Project a stop onto ALL shape lines for a route (merged). Returns cumulative position.
 * Returns -1 if the stop is not near the route shape.
 * (Legacy — used for single-stop projection.)
 */
function projectStopOntoRoute(
    stopLat: number, stopLon: number,
    coordinates: number[][][]
): number {
    let bestDist = Infinity;
    let bestPosition = -1;

    let cumulativeDistance = 0;

    for (const line of coordinates) {
        for (let i = 0; i < line.length - 1; i++) {
            const [aLon, aLat] = line[i];
            const [bLon, bLat] = line[i + 1];

            const segLen = haversineDistance(aLat, aLon, bLat, bLon);
            const dist = pointToSegmentDistance(stopLat, stopLon, aLat, aLon, bLat, bLon);

            if (dist < bestDist && dist <= PROXIMITY_THRESHOLD_METERS) {
                bestDist = dist;
                const cosLat = Math.cos(aLat * Math.PI / 180);
                const mPerDegLat = 111320;
                const mPerDegLon = 111320 * cosLat;
                const px = (stopLon - aLon) * mPerDegLon;
                const py = (stopLat - aLat) * mPerDegLat;
                const bx = (bLon - aLon) * mPerDegLon;
                const by = (bLat - aLat) * mPerDegLat;
                const abLenSq = bx * bx + by * by;
                const t = abLenSq === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / abLenSq));
                bestPosition = cumulativeDistance + t * segLen;
            }

            cumulativeDistance += segLen;
        }
    }

    return bestPosition;
}

/**
 * Find the best single shape line where BOTH stops appear,
 * and return their positions on that line plus the shape distance between them.
 * This is critical for multi-variant routes (e.g. Route 1 with 44 shape lines)
 * where merging all lines breaks direction checking.
 *
 * Returns null if no single line contains both stops.
 */
function projectStopPairOntoRoute(
    stopALat: number, stopALon: number,
    stopBLat: number, stopBLon: number,
    coordinates: number[][][]
): { posA: number; posB: number; lineIndex: number; shapeDistance: number } | null {
    let bestResult: { posA: number; posB: number; lineIndex: number; shapeDistance: number } | null = null;
    let bestScore = Infinity; // lower is better (sum of projection distances)

    for (let li = 0; li < coordinates.length; li++) {
        const line = coordinates[li];
        const projA = projectStopOntoLine(stopALat, stopALon, line);
        const projB = projectStopOntoLine(stopBLat, stopBLon, line);

        // Both stops must be found on this line
        if (projA.position < 0 || projB.position < 0) continue;

        const score = projA.distance + projB.distance;
        if (score < bestScore) {
            bestScore = score;
            bestResult = {
                posA: projA.position,
                posB: projB.position,
                lineIndex: li,
                shapeDistance: Math.abs(projB.position - projA.position)
            };
        }
    }

    return bestResult;
}

/**
 * Build the index. Called lazily on first access.
 */
function buildIndex(): void {
    console.log('[StopToRouteIndex] Building stop-to-route index from GTFS data...');
    const startTime = performance.now();

    stopToRoutes = new Map<string, Set<string>>();
    routeToStops = new Map<string, Set<string>>();

    // Build routeShapesCache from transitShapes.json geometry (stable GeoJSON shapes)
    const features = (transitShapesData as any).features as ShapeFeature[];
    routeShapesCache = new Map<string, number[][][]>();
    for (const feature of features) {
        const routeNum = feature.properties.ROUTE_NUM;
        if (!routeNum) continue;
        const existing = routeShapesCache.get(routeNum) || [];
        existing.push(...feature.geometry.coordinates);
        routeShapesCache.set(routeNum, existing);
    }

    // Build stop↔route index from authoritative GTFS data
    let associations = 0;
    const gtfs = gtfsStopRoutes as Record<string, Record<string, number[]>>;

    for (const [stopId, routeMap] of Object.entries(gtfs)) {
        const routeNums = Object.keys(routeMap);
        if (routeNums.length === 0) continue;

        stopToRoutes.set(stopId, new Set(routeNums));

        for (const routeNum of routeNums) {
            if (!routeToStops.has(routeNum)) {
                routeToStops.set(routeNum, new Set());
            }
            routeToStops.get(routeNum)!.add(stopId);
            associations++;
        }
    }

    // Build per-direction GTFS shape cache for use by checkStopDirection.
    // Keys: "routeNum-dir" (e.g. "18-0", "18-1"). Values: [lng,lat][] (projection-ready).
    const dirShapes = gtfsDirectionalShapes as Record<string, Record<string, number[][]>>;
    gtfsDirCache = new Map<string, number[][]>();
    for (const [routeNum, dirMap] of Object.entries(dirShapes)) {
        for (const [dir, coords] of Object.entries(dirMap)) {
            // GTFS stores [lat,lng]; projection expects [lng,lat]
            gtfsDirCache.set(`${routeNum}-${dir}`, coords.map(([lat, lng]) => [lng, lat]));
        }
    }

    // Build stop-sequence cache: authoritative ordered stop lists per route+direction.
    // Keys: "routeNum-dir". Values: ordered stop ID array (from stop_times.txt).
    stopById = new Map(transitStops.map(s => [s.STOP_ID, s]));

    const seqs = gtfsStopSequences as Record<string, Record<string, string[]>>;
    gtfsSeqCache = new Map<string, string[]>();
    gtfsSeqDistCache = new Map<string, number[]>();
    for (const [routeNum, dirMap] of Object.entries(seqs)) {
        for (const [dir, stops] of Object.entries(dirMap)) {
            gtfsSeqCache.set(`${routeNum}-${dir}`, stops);

            // Cumulative stop-to-stop distance, so a ride's length follows the bus's actual path
            // (including loops and doglegs) rather than a straight line between the two stops
            const cumulative = [0];
            for (let i = 1; i < stops.length; i++) {
                const prev = stopById.get(stops[i - 1]);
                const cur = stopById.get(stops[i]);
                const step = prev && cur
                    ? haversineDistance(parseFloat(prev.LAT), parseFloat(prev.LON), parseFloat(cur.LAT), parseFloat(cur.LON))
                    : 0;
                cumulative.push(cumulative[i - 1] + step);
            }
            gtfsSeqDistCache.set(`${routeNum}-${dir}`, cumulative);
        }
    }

    const elapsed = (performance.now() - startTime).toFixed(0);
    console.log(`[StopToRouteIndex] Built index in ${elapsed}ms: ${associations} stop-route pairs, ${routeShapesCache.size} routes, ${gtfsDirCache.size} GTFS dir shapes`);
}

/**
 * Ensure the index is built.
 */
function ensureIndex(): void {
    if (!stopToRoutes || !routeToStops) {
        buildIndex();
    }
}

/**
 * Get all route numbers that serve a given stop.
 */
export function getRoutesForStop(stopId: string): Set<string> {
    ensureIndex();
    return stopToRoutes!.get(stopId) || new Set();
}

/**
 * Get all stop IDs served by a given route.
 */
export function getStopsForRoute(routeNum: string): Set<string> {
    ensureIndex();
    return routeToStops!.get(routeNum) || new Set();
}

/**
 * Get the full stop-to-routes map.
 */
export function getStopToRoutesMap(): Map<string, Set<string>> {
    ensureIndex();
    return stopToRoutes!;
}

/**
 * Get the full route-to-stops map.
 */
export function getRouteToStopsMap(): Map<string, Set<string>> {
    ensureIndex();
    return routeToStops!;
}

/**
 * Get cached route shapes (coordinates per routeNum).
 */
export function getRouteShapes(): Map<string, number[][][]> {
    ensureIndex();
    return routeShapesCache!;
}

/**
 * Get the GTFS direction_id(s) that a given stop serves for a given route.
 * Returns [0], [1], or [0, 1] — where 0=outbound, 1=inbound.
 * Returns [] if the stop/route combo isn't in the GTFS data.
 *
 * Use this to pre-filter stops before running geometric direction checks:
 * if the destination stop serves only direction 0, only allow origin stops
 * that also serve direction 0 (the same outbound variant of the route).
 */
export function getGtfsDirectionsForStop(stopId: string, routeNum: string): number[] {
    const gtfs = gtfsStopRoutes as Record<string, Record<string, number[]>>;
    return gtfs[stopId]?.[routeNum] ?? [];
}


/**
 * Ride from stop A (on one direction's trip) to stop B (on the other direction's trip) by staying on
 * the bus as it turns round at the terminus where the first trip ends and the second begins.
 * Returns the ride length and the stops passed in between, or null if no such ride is short enough.
 */
function rideThroughTerminus(
    routeNum: string,
    stopAId: string,
    stopBId: string
): { shapeDistance: number; stopIds: string[]; dirA: string; dirB: string } | null {
    if (!gtfsSeqCache || !gtfsSeqDistCache) return null;
    const dirsA = getGtfsDirectionsForStop(stopAId, routeNum);
    const dirsB = getGtfsDirectionsForStop(stopBId, routeNum);

    let best: { shapeDistance: number; stopIds: string[]; dirA: string; dirB: string } | null = null;
    for (const dirA of dirsA) {
        for (const dirB of dirsB) {
            if (dirA === dirB) continue;
            const seqA = gtfsSeqCache.get(`${routeNum}-${dirA}`);
            const seqB = gtfsSeqCache.get(`${routeNum}-${dirB}`);
            const cumA = gtfsSeqDistCache.get(`${routeNum}-${dirA}`);
            const cumB = gtfsSeqDistCache.get(`${routeNum}-${dirB}`);
            if (!seqA || !seqB || !cumA || !cumB) continue;
            // Trip A must end where trip B starts
            if (seqA[seqA.length - 1] !== seqB[0]) continue;

            const posA = seqA.indexOf(stopAId);
            const posB = seqB.indexOf(stopBId);
            if (posA === -1 || posB <= 0) continue;

            const toTerminus = cumA[cumA.length - 1] - cumA[posA];
            if (toTerminus > TERMINUS_RIDE_THROUGH_MAX_METERS) continue;

            const shapeDistance = toTerminus + cumB[posB];
            if (!best || shapeDistance < best.shapeDistance) {
                // seqA's last stop is seqB's first: list the terminus once
                best = {
                    shapeDistance,
                    stopIds: [...seqA.slice(posA + 1), ...seqB.slice(1, posB)],
                    dirA: String(dirA), dirB: String(dirB),
                };
            }
        }
    }
    return best;
}

/**
 * When riding from stop A to stop B means staying on as the bus turns round at the end of the line,
 * the name of that terminus. Null for an ordinary ride in one direction.
 */
export function getTerminusTurnaround(routeNum: string, fromStopId: string, toStopId: string): string | null {
    ensureIndex();
    if (sharesGtfsDirection(routeNum, fromStopId, toStopId)) return null;
    const through = rideThroughTerminus(routeNum, fromStopId, toStopId);
    if (!through) return null;
    const terminusId = gtfsSeqCache!.get(`${routeNum}-${through.dirB}`)![0];
    return stopById!.get(terminusId)?.STOP_NAME ?? 'the end of the line';
}

/**
 * Path of a ride along the GTFS direction shapes, which always run in travel order: the stretch of
 * the direction both stops share, or for a ride through a terminus, the end of one direction's shape
 * and the start of the other's. Null when the shapes don't cover the ride.
 */
export function getGtfsRidePath(routeNum: string, fromStopId: string, toStopId: string): { lat: number; lng: number }[] | null {
    ensureIndex();
    const from = stopById!.get(fromStopId);
    const to = stopById!.get(toStopId);
    if (!from || !to) return null;

    // Points where the shape passes the stop. It can pass more than once, so every point within 25m
    // of the closest counts; a stop over 150m from the shape isn't on it at all.
    const nearIndexes = (line: number[][], stop: { LAT: string; LON: string }) => {
        const lat = parseFloat(stop.LAT), lng = parseFloat(stop.LON);
        const dists = line.map(([pLng, pLat]) => haversineDistance(lat, lng, pLat, pLng));
        const closest = Math.min(...dists);
        if (closest > 150) return [];
        return dists.flatMap((d, i) => (d <= closest + 25 ? [i] : []));
    };
    const toLatLng = (coords: number[][]) => coords.map(([lng, lat]) => ({ lat, lng }));

    if (!sharesGtfsDirection(routeNum, fromStopId, toStopId)) {
        const through = rideThroughTerminus(routeNum, fromStopId, toStopId);
        const lineA = through && gtfsDirCache!.get(`${routeNum}-${through.dirA}`);
        const lineB = through && gtfsDirCache!.get(`${routeNum}-${through.dirB}`);
        if (!lineA || !lineB) return null;
        // Board on line A's last pass by the stop (nearest the terminus), alight on line B's first
        const boardings = nearIndexes(lineA, from), alightings = nearIndexes(lineB, to);
        if (boardings.length === 0 || alightings.length === 0) return null;
        return toLatLng([
            ...lineA.slice(boardings[boardings.length - 1]),
            ...lineB.slice(1, alightings[0] + 1), // lineB[0] is lineA's last point
        ]);
    }

    // Shortest forward stretch, over the directions both stops share
    const dirsB = getGtfsDirectionsForStop(toStopId, routeNum);
    let best: { coords: number[][]; length: number } | null = null;
    for (const dir of getGtfsDirectionsForStop(fromStopId, routeNum).filter(d => dirsB.includes(d))) {
        const line = gtfsDirCache!.get(`${routeNum}-${dir}`);
        if (!line) continue;
        const cumulative = [0];
        for (let i = 1; i < line.length; i++) {
            cumulative.push(cumulative[i - 1] + haversineDistance(line[i - 1][1], line[i - 1][0], line[i][1], line[i][0]));
        }
        const alightings = nearIndexes(line, to);
        for (const a of nearIndexes(line, from)) {
            const b = alightings.find(i => i > a);
            if (b === undefined) continue;
            const length = cumulative[b] - cumulative[a];
            if (!best || length < best.length) best = { coords: line.slice(a, b + 1), length };
        }
    }
    return best ? toLatLng(best.coords) : null;
}

/** True unless both stops have GTFS direction data for the route and no direction serves both. */
function sharesGtfsDirection(routeNum: string, stopAId: string, stopBId: string): boolean {
    const dirsA = getGtfsDirectionsForStop(stopAId, routeNum);
    const dirsB = getGtfsDirectionsForStop(stopBId, routeNum);
    return dirsA.length === 0 || dirsB.length === 0 || dirsA.some(d => dirsB.includes(d));
}

/**
 * Get ordered intermediate stop names between fromStopId and toStopId for a given route.
 * Uses per-line projection: finds the best single shape line containing both endpoints,
 * then projects all route stops onto that line to determine ordering.
 * Returns just the stop names between from and to (exclusive of both endpoints).
 */
export function getOrderedStopsForRoute(
    routeNum: string,
    fromStopId: string,
    toStopId: string
): string[] {
    ensureIndex();

    const stopIds = routeToStops!.get(routeNum);
    if (!stopIds) return [];

    // Riding through the terminus: the stops come straight from the two trips' sequences
    if (!sharesGtfsDirection(routeNum, fromStopId, toStopId)) {
        const through = rideThroughTerminus(routeNum, fromStopId, toStopId);
        if (through) {
            return through.stopIds.flatMap(id => {
                const stop = stopById!.get(id);
                return stop ? [stop.STOP_NAME] : [];
            });
        }
    }

    const shapes = routeShapesCache!.get(routeNum);
    if (!shapes) return [];

    // Find the best shape line containing both endpoints
    const fromStop = transitStops.find(s => s.STOP_ID === fromStopId);
    const toStop = transitStops.find(s => s.STOP_ID === toStopId);
    if (!fromStop || !toStop) return [];

    const pairResult = projectStopPairOntoRoute(
        parseFloat(fromStop.LAT), parseFloat(fromStop.LON),
        parseFloat(toStop.LAT), parseFloat(toStop.LON),
        shapes
    );

    // Use the resolved best line for projection, or fall back to all shapes
    const projectionShapes = pairResult
        ? [shapes[pairResult.lineIndex]]
        : shapes;

    // Project all stops on this route onto the selected shape line
    const stopPositions: { stopId: string; name: string; position: number }[] = [];

    for (const stopId of stopIds) {
        const stop = transitStops.find(s => s.STOP_ID === stopId);
        if (!stop) continue;

        const pos = projectStopOntoRoute(
            parseFloat(stop.LAT), parseFloat(stop.LON), projectionShapes
        );
        if (pos >= 0) {
            stopPositions.push({ stopId, name: stop.STOP_NAME, position: pos });
        }
    }

    // Sort by position along route
    stopPositions.sort((a, b) => a.position - b.position);

    // Find from and to positions
    const fromIdx = stopPositions.findIndex(s => s.stopId === fromStopId);
    const toIdx = stopPositions.findIndex(s => s.stopId === toStopId);

    if (fromIdx === -1 || toIdx === -1) return [];

    // Get stops between from and to (exclusive of endpoints)
    const startIdx = Math.min(fromIdx, toIdx);
    const endIdx = Math.max(fromIdx, toIdx);

    const intermediateStops = stopPositions
        .slice(startIdx + 1, endIdx)
        .map(s => s.name);

    return intermediateStops;
}

/**
 * Get the position of a stop along a route shape.
 * Returns -1 if the stop is not on the route.
 * Useful for checking if origin stop comes before destination stop along the route.
 */
export function getStopPositionOnRoute(
    routeNum: string,
    stopId: string
): number {
    ensureIndex();

    const shapes = routeShapesCache!.get(routeNum);
    if (!shapes) return -1;

    const stop = transitStops.find(s => s.STOP_ID === stopId);
    if (!stop) return -1;

    return projectStopOntoRoute(parseFloat(stop.LAT), parseFloat(stop.LON), shapes);
}

/**
 * Check direction of two stops on a route using per-line projection.
 * Returns { valid, posA, posB, shapeDistance } where valid=true means
 * stopA comes before stopB on the best matching shape line.
 * Returns null if no line contains both stops.
 */
/**
 * Project a stop onto a [lng,lat][] line, returning cumulative position (metres) or -1 if > thresholdM away.
 */
function projectStopOntoGtfsLine(stopLat: number, stopLon: number, line: number[][], thresholdM: number): number {
    let bestDist = Infinity;
    let bestPos = -1;
    let cumLen = 0;
    for (let i = 0; i < line.length - 1; i++) {
        const [aLon, aLat] = line[i];
        const [bLon, bLat] = line[i + 1];
        const segLen = haversineDistance(aLat, aLon, bLat, bLon);
        const d = pointToSegmentDistance(stopLat, stopLon, aLat, aLon, bLat, bLon);
        if (d < bestDist && d <= thresholdM) {
            bestDist = d;
            // Fractional position along this segment
            const cosLat = Math.cos(aLat * Math.PI / 180);
            const m = 111320;
            const px = (stopLon - aLon) * m * cosLat;
            const py = (stopLat - aLat) * m;
            const bx = (bLon - aLon) * m * cosLat;
            const by = (bLat - aLat) * m;
            const ab2 = bx * bx + by * by;
            const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / ab2));
            bestPos = cumLen + t * segLen;
        }
        cumLen += segLen;
    }
    return bestPos;
}

export function checkStopDirection(
    routeNum: string,
    stopAId: string,
    stopBId: string
): { valid: boolean; shapeDistance: number } | null {
    ensureIndex();

    const cacheKey = `${routeNum}|${stopAId}|${stopBId}`;
    if (directionCheckCache.has(cacheKey)) return directionCheckCache.get(cacheKey)!;
    const result = computeStopDirection(routeNum, stopAId, stopBId);
    directionCheckCache.set(cacheKey, result);
    return result;
}

function computeStopDirection(
    routeNum: string,
    stopAId: string,
    stopBId: string
): { valid: boolean; shapeDistance: number } | null {
    const stopA = stopById!.get(stopAId);
    const stopB = stopById!.get(stopBId);
    if (!stopA || !stopB) return null;

    const aLat = parseFloat(stopA.LAT), aLon = parseFloat(stopA.LON);
    const bLat = parseFloat(stopB.LAT), bLon = parseFloat(stopB.LON);
    const straightLine = haversineDistance(aLat, aLon, bLat, bLon);

    const gtfs = gtfsStopRoutes as Record<string, Record<string, number[]>>;
    const dirsA = gtfs[stopAId]?.[routeNum] ?? [];
    const dirsB = gtfs[stopBId]?.[routeNum] ?? [];
    const sharedDirs = dirsA.filter(d => dirsB.includes(d));

    // Both stops are known to GTFS but no single trip direction serves both (e.g. a SB-only stop
    // and a NB-only stop): the rider has to stay on through the terminus. That's fine near the end
    // of the line, where the bus just loops round; otherwise reject. Without this, the geometric
    // tiers below project the stop onto the opposite direction's shape (the two carriageways are
    // well within tolerance) and report a short, "valid" ride the wrong way.
    if (dirsA.length > 0 && dirsB.length > 0 && sharedDirs.length === 0) {
        const through = rideThroughTerminus(routeNum, stopAId, stopBId);
        return through
            ? { valid: true, shapeDistance: Math.max(through.shapeDistance, straightLine) }
            : { valid: false, shapeDistance: straightLine };
    }

    // Prioritize directions shared by both stops; fall back to all dirs either stop serves
    const orderedDirs = sharedDirs.length > 0
        ? sharedDirs
        : [...new Set([...dirsA, ...dirsB])];

    // ── TIER 1: GTFS stop-sequence lookup (most authoritative) ───────────────
    // Uses the actual ordered stop list from stop_times.txt.
    // No geometry involved — pure index lookup, never fails due to GPS offset.
    if (orderedDirs.length > 0 && gtfsSeqCache && gtfsSeqDistCache) {
        let bestSeqResult: { valid: boolean; shapeDistance: number } | null = null;

        for (const dir of orderedDirs) {
            const key = `${routeNum}-${dir}`;
            const seq = gtfsSeqCache.get(key);
            const cumulative = gtfsSeqDistCache.get(key);
            if (!seq || !cumulative) continue;
            const posA = seq.indexOf(stopAId);
            const posB = seq.indexOf(stopBId);
            if (posA === -1 || posB === -1) continue; // one or both stops not in this direction's sequence

            // Loop route detection: if first stop == last stop, the bus circles back.
            // On a loop (A→B→C→D→A), going from C→A is valid (C→D→A forward around loop),
            // but the rider travels the rest of the loop — measure that, not the straight line.
            const isLoop = seq.length > 2 && seq[0] === seq[seq.length - 1];
            let candidate: { valid: boolean; shapeDistance: number };
            if (posA === posB) {
                candidate = { valid: false, shapeDistance: 0 }; // same stop — not a ride
            } else if (posA < posB) {
                candidate = { valid: true, shapeDistance: cumulative[posB] - cumulative[posA] };
            } else if (isLoop) {
                const loopLength = cumulative[cumulative.length - 1];
                candidate = { valid: true, shapeDistance: loopLength - cumulative[posA] + cumulative[posB] };
            } else {
                candidate = { valid: false, shapeDistance: straightLine };
            }
            // Never report less than the straight line (guards against sequence data gaps)
            candidate.shapeDistance = Math.max(candidate.shapeDistance, straightLine);

            // Prefer any valid result over invalid; among valid results take the shortest ride
            if (!bestSeqResult
                || (candidate.valid && !bestSeqResult.valid)
                || (candidate.valid && bestSeqResult.valid && candidate.shapeDistance < bestSeqResult.shapeDistance)) {
                bestSeqResult = candidate;
            }
        }
        if (bestSeqResult !== null) return bestSeqResult;
    }

    // Tiers 2–3 are geometric guesses, so cross-check them against the stops' compass directions
    // (NB/SB/EB/WB). A compass contradiction means the bus would be heading away from stop B —
    // typically the rider was matched to the stop on the wrong side of the street.
    const compass = checkCompassDirection(stopAId, stopBId);
    const withCompass = (geo: { valid: boolean; shapeDistance: number }) =>
        geo.valid && compass && !compass.valid ? { ...geo, valid: false } : geo;

    // ── TIER 2: GTFS directional shape projection (geometric, 150m tolerance) ─
    // Fallback when a stop isn't in the sequence data (e.g. route variant coverage gap).
    const GTFS_THRESHOLD = 150;
    if (orderedDirs.length > 0 && gtfsDirCache) {
        let bestGeoResult: { valid: boolean; shapeDistance: number } | null = null;
        for (const dir of orderedDirs) {
            const line = gtfsDirCache.get(`${routeNum}-${dir}`);
            if (!line) continue;
            const posA = projectStopOntoGtfsLine(aLat, aLon, line, GTFS_THRESHOLD);
            const posB = projectStopOntoGtfsLine(bLat, bLon, line, GTFS_THRESHOLD);
            if (posA < 0 || posB < 0) continue;
            const candidate = {
                valid: posA < posB,
                shapeDistance: Math.abs(posB - posA)
            };
            if (!bestGeoResult || (candidate.valid && !bestGeoResult.valid)) {
                bestGeoResult = candidate;
            }
        }
        if (bestGeoResult !== null) return withCompass(bestGeoResult);
    }

    // ── TIER 3: merged transitShapes.json per-line projection ────────────────
    // Last resort for routes that have no GTFS directional data at all.
    const shapes = routeShapesCache!.get(routeNum);
    const result = shapes ? projectStopPairOntoRoute(aLat, aLon, bLat, bLon, shapes) : null;
    if (result) return withCompass({ valid: result.posA < result.posB, shapeDistance: result.shapeDistance });

    // ── TIER 4: compass directions alone ─────────────────────────────────────
    // No route geometry covers both stops; the stop directions are the only evidence left.
    if (compass) return { valid: compass.valid, shapeDistance: straightLine };
    return null;
}
