/**
 * StopToRouteIndex — maps each bus stop to the routes that serve it,
 * by checking proximity of every stop to each route's shape geometry.
 */
import transitStops from '../data/transitStops';
import transitShapesData from '../data/transitShapes.json';
import { ShapeFeature } from '../models/transit/StoptoRouteIndex';


// Singleton index
let stopToRoutes: Map<string, Set<string>> | null = null;
let routeToStops: Map<string, Set<string>> | null = null;

const PROXIMITY_THRESHOLD_METERS = 100; // Stop must be within 100m of route shape

/**
 * Calculate distance in meters between two lat/lng points using Haversine formula.
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
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
 * Build the index. Called lazily on first access.
 */
function buildIndex(): void {
    console.log('[StopToRouteIndex] Building stop-to-route index...');
    const startTime = performance.now();

    stopToRoutes = new Map<string, Set<string>>();
    routeToStops = new Map<string, Set<string>>();

    const features = (transitShapesData as any).features as ShapeFeature[];

    // Deduplicate by ROUTE_NUM (multiple shapes per route)
    const routeShapes = new Map<string, number[][][]>();
    for (const feature of features) {
        const routeNum = feature.properties.ROUTE_NUM;
        if (!routeNum) continue;

        const existing = routeShapes.get(routeNum) || [];
        existing.push(...feature.geometry.coordinates);
        routeShapes.set(routeNum, existing);
    }

    console.log(`[StopToRouteIndex] Processing ${transitStops.length} stops × ${routeShapes.size} routes`);

    let associations = 0;

    for (const stop of transitStops) {
        const stopLat = parseFloat(stop.LAT);
        const stopLon = parseFloat(stop.LON);
        const stopRoutes = new Set<string>();

        for (const [routeNum, coordinates] of routeShapes) {
            if (isStopNearRoute(stopLat, stopLon, coordinates, PROXIMITY_THRESHOLD_METERS)) {
                stopRoutes.add(routeNum);

                if (!routeToStops.has(routeNum)) {
                    routeToStops.set(routeNum, new Set());
                }
                routeToStops.get(routeNum)!.add(stop.STOP_ID);
                associations++;
            }
        }

        if (stopRoutes.size > 0) {
            stopToRoutes.set(stop.STOP_ID, stopRoutes);
        }
    }

    const elapsed = (performance.now() - startTime).toFixed(0);
    console.log(`[StopToRouteIndex] Built index in ${elapsed}ms: ${associations} stop-route associations`);
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
