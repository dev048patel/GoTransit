/**
 * StopDirectionIndex — compass travel direction (NB / SB / EB / WB) for each bus stop.
 *
 * Every Regina Transit stop has a DIRECTION (e.g. "Albert St @ Victoria Ave (NB)" → "NB"):
 * the direction buses travel when they serve it. This is the most reliable signal for
 * "which side of the street" a stop is on, and is used to reject trip legs whose
 * bus would be heading away from the rider's destination.
 */
import transitStops from '../data/transitStops';
import { Coordinates } from '../MapModel';
import { StopDirection, STOP_DIRECTION_HEADING } from '../transit/StopDirection';

export type { StopDirection };

// Legs shorter than this are too short for a compass check (stop offsets dominate the bearing)
const MIN_LEG_FOR_COMPASS_CHECK_M = 250;
// Reject a leg when the stops' headings deviate from the ride's bearing by more than this on average.
// Above 90° so L-shaped rides (NB stop → west along an avenue → NB stop, ~93° at both ends) pass,
// while wrong-side-of-street legs (bus departs ~170° off, arrives ~100° off) are rejected.
const MAX_MEAN_HEADING_DEVIATION_DEG = 110;

let stopIndex: Map<string, { location: Coordinates; direction: StopDirection | null }> | null = null;

function getStopIndex() {
    if (!stopIndex) {
        stopIndex = new Map(transitStops.map(stop => [stop.STOP_ID, {
            location: { lat: parseFloat(stop.LAT), lng: parseFloat(stop.LON) },
            direction: stop.DIRECTION,
        }]));
    }
    return stopIndex;
}

/** Travel direction of buses at this stop, or null if unknown (e.g. the Airport stop). */
export function getStopDirection(stopId: string): StopDirection | null {
    return getStopIndex().get(stopId)?.direction ?? null;
}

/** Initial compass bearing from one point to another, in degrees [0, 360). */
export function bearingBetween(from: Coordinates, to: Coordinates): number {
    const toRad = (d: number) => d * Math.PI / 180;
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);
    const dLng = toRad(to.lng - from.lng);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function angleDifference(a: number, b: number): number {
    const diff = Math.abs(a - b) % 360;
    return diff > 180 ? 360 - diff : diff;
}

/** Great-circle distance between two points, in metres. */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
    const toRad = (d: number) => d * Math.PI / 180;
    const h = Math.sin(toRad(b.lat - a.lat) / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2;
    return 2 * 6371e3 * Math.asin(Math.sqrt(h));
}

/**
 * Compass sanity check for riding a bus from stop A to stop B.
 *
 * The bus leaving A should be heading roughly towards B, and the bus arriving at B should be
 * coming from roughly A's side. Each known stop direction is compared with the A→B bearing, and
 * the leg is rejected when the average deviation is too large — the bus would depart heading
 * away from B, meaning the rider is on the wrong side of the street (or faces a full loop).
 * Opposite-direction stop pairs (NB → SB, a U-turn route) always average 90° and pass.
 *
 * Returns null when there is not enough information (unknown directions or a very short leg).
 */
export function checkCompassDirection(fromStopId: string, toStopId: string): { valid: boolean } | null {
    const from = getStopIndex().get(fromStopId);
    const to = getStopIndex().get(toStopId);
    if (!from || !to) return null;
    if (distanceMeters(from.location, to.location) < MIN_LEG_FOR_COMPASS_CHECK_M) return null;

    const rideBearing = bearingBetween(from.location, to.location);
    const deviations = [from.direction, to.direction]
        .filter((dir): dir is StopDirection => dir !== null)
        .map(dir => angleDifference(STOP_DIRECTION_HEADING[dir], rideBearing));
    if (deviations.length === 0) return null;

    const meanDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
    return { valid: meanDeviation <= MAX_MEAN_HEADING_DEVIATION_DEG };
}
