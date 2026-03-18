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

// Singleton index
let stopToRoutes: Map<string, Set<string>> | null = null;
let routeToStops: Map<string, Set<string>> | null = null;
let routeShapesCache: Map<string, number[][][]> | null = null;
// Per-direction GTFS shapes: key = "routeNum-dir", value = [lng,lat][] (projection-ready)
let gtfsDirCache: Map<string, number[][]> | null = null;
// Per-direction GTFS stop sequences: key = "routeNum-dir", value = ordered stop ID array
let gtfsSeqCache: Map<string, string[]> | null = null;

const PROXIMITY_THRESHOLD_METERS = 65; // Stop must be within 65m of shape line for projection
// (40m was too tight — directional shapes for NB/SB routes are on opposite sides of the road,
// and stops offset from centerline can land 50-60m from the 'wrong' direction's shape)

/**
 * Calculate distance in meters between two lat/lng points using Haversine formula.
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number { // assuming lat and lon are in degree
    const earthRadius = 6173e3;

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
    const seqs = gtfsStopSequences as Record<string, Record<string, string[]>>;
    gtfsSeqCache = new Map<string, string[]>();
    for (const [routeNum, dirMap] of Object.entries(seqs)) {
        for (const [dir, stops] of Object.entries(dirMap)) {
            gtfsSeqCache.set(`${routeNum}-${dir}`, stops);
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

    const stopA = transitStops.find(s => s.STOP_ID === stopAId);
    const stopB = transitStops.find(s => s.STOP_ID === stopBId);
    if (!stopA || !stopB) return null;

    const aLat = parseFloat(stopA.LAT), aLon = parseFloat(stopA.LON);
    const bLat = parseFloat(stopB.LAT), bLon = parseFloat(stopB.LON);

    const gtfs = gtfsStopRoutes as Record<string, Record<string, number[]>>;
    const dirsA = gtfs[stopAId]?.[routeNum] ?? [];
    const dirsB = gtfs[stopBId]?.[routeNum] ?? [];
    const sharedDirs = dirsA.filter(d => dirsB.includes(d));
    // Prioritize directions shared by both stops; fall back to all dirs either stop serves
    const orderedDirs = sharedDirs.length > 0
        ? sharedDirs
        : [...new Set([...dirsA, ...dirsB])];

    // ── TIER 1: GTFS stop-sequence lookup (most authoritative) ───────────────
    // Uses the actual ordered stop list from stop_times.txt.
    // No geometry involved — pure index lookup, never fails due to GPS offset.
    if (orderedDirs.length > 0 && gtfsSeqCache) {
        let bestSeqResult: { valid: boolean; shapeDistance: number } | null = null;

        for (const dir of orderedDirs) {
            const seq = gtfsSeqCache.get(`${routeNum}-${dir}`);
            if (!seq) continue;
            const posA = seq.indexOf(stopAId);
            const posB = seq.indexOf(stopBId);
            if (posA === -1 || posB === -1) continue; // one or both stops not in this direction's sequence

            // Estimate on-route distance using haversine between the two stop coordinates
            const shapeDist = haversineDistance(aLat, aLon, bLat, bLon);
            const candidate = { valid: posA < posB, shapeDistance: shapeDist };

            // Prefer any valid result over invalid; among valids take the first found
            if (!bestSeqResult || (candidate.valid && !bestSeqResult.valid)) {
                bestSeqResult = candidate;
            }
        }
        if (bestSeqResult !== null) return bestSeqResult;
    }

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
        if (bestGeoResult !== null) return bestGeoResult;
    }

    // ── TIER 3: merged transitShapes.json per-line projection ────────────────
    // Last resort for routes that have no GTFS directional data at all.
    const shapes = routeShapesCache!.get(routeNum);
    if (!shapes) return null;
    const result = projectStopPairOntoRoute(aLat, aLon, bLat, bLon, shapes);
    if (!result) return null;
    return { valid: result.posA < result.posB, shapeDistance: result.shapeDistance };
}

