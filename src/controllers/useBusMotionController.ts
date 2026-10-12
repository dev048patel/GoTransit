/*
 Smooth motion for a live bus marker. Positions arrive every ~1.5s, a few metres to tens of metres
 apart; instead of jumping, the bus glides from where it is drawn to each new position, following
 the route's road where the hop bends round a corner, and turns gradually to its new heading.

 Frames go straight to the caller (which moves the map marker) rather than through React state,
 so dozens of buses can animate without re-rendering the map.
*/
import { useEffect, useRef } from 'react';
import { BusPosition } from '../models/transit/BusPosition';
import { RoutePolylineService } from '../models/services/RoutePolylineService';
import { bearingBetween, distanceMeters } from '../models/services/StopDirectionIndex';

type LatLng = { lat: number; lng: number };

// Further than this between reports and the bus jumps: it reappeared, or the GPS glitched
const SNAP_DISTANCE_M = 300;
// Hops shorter than this are a straight line along the street; longer ones may round a corner
const FOLLOW_ROAD_MIN_M = 40;
// Each glide lasts about as long as the gap between this bus's reports, so motion is continuous
const DEFAULT_GLIDE_MS = 1500, MIN_GLIDE_MS = 600, MAX_GLIDE_MS = 3000;
// Along a path, turn to face each stretch only once it's long enough to have a reliable direction
const MIN_SEGMENT_FOR_HEADING_M = 3;

interface Glide {
    path: LatLng[];
    cumulative: number[];   // distance (m) along the path at each point
    fromHeading: number;
    toHeading: number;
    start: number;          // performance.now() when the glide began
    duration: number;       // ms
}

/** Heading part-way round the shorter turn from a to b. */
function turnBetween(a: number, b: number, t: number): number {
    const delta = ((b - a + 540) % 360) - 180;
    return (a + delta * t + 360) % 360;
}

/** Point and travel bearing at a distance along a path. */
function alongPath(glide: Glide, distance: number): { position: LatLng; bearing: number | null } {
    const { path, cumulative } = glide;
    let i = 1;
    while (i < path.length - 1 && cumulative[i] < distance) i++;
    const a = path[i - 1], b = path[i];
    const segment = cumulative[i] - cumulative[i - 1];
    const t = segment > 0 ? Math.min(1, Math.max(0, (distance - cumulative[i - 1]) / segment)) : 1;
    return {
        position: { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t },
        bearing: segment >= MIN_SEGMENT_FOR_HEADING_M ? bearingBetween(a, b) : null,
    };
}

/**
 * Animate a bus towards each new reported position. `draw` is called with the position and heading
 * to show, on the first report and then every animation frame while the bus is moving.
 */
export function useBusMotionController(bus: BusPosition, draw: (position: LatLng, heading: number) => void): void {
    const drawRef = useRef(draw);
    drawRef.current = draw;

    const shown = useRef<{ position: LatLng; heading: number } | null>(null);
    const lastReportAt = useRef<number | null>(null);
    const frame = useRef<number | null>(null);

    useEffect(() => {
        const target = { lat: bus.lat, lng: bus.lng };
        const heading = bus.heading || 0;
        const now = performance.now();
        const sinceLastReport = lastReportAt.current === null ? DEFAULT_GLIDE_MS : now - lastReportAt.current;
        lastReportAt.current = now;

        const show = (position: LatLng, h: number) => {
            shown.current = { position, heading: h };
            drawRef.current(position, h);
        };
        const stop = () => {
            if (frame.current !== null) cancelAnimationFrame(frame.current);
            frame.current = null;
        };

        const from = shown.current;
        const distance = from ? distanceMeters(from.position, target) : Infinity;
        if (!from || distance > SNAP_DISTANCE_M) {
            stop();
            show(target, heading);
            return;
        }

        // Follow the road on longer hops; otherwise (or if the road can't be matched) a straight line
        const roadPath = distance >= FOLLOW_ROAD_MIN_M
            ? RoutePolylineService.getDrivePath(String(bus.route_num), from.position, from.heading, target, heading)
            : null;
        const path = roadPath ?? [from.position, target];
        const cumulative = [0];
        for (let i = 1; i < path.length; i++) cumulative.push(cumulative[i - 1] + distanceMeters(path[i - 1], path[i]));

        const glide: Glide = {
            path,
            cumulative,
            fromHeading: from.heading,
            toHeading: heading,
            start: now,
            duration: Math.min(MAX_GLIDE_MS, Math.max(MIN_GLIDE_MS, sinceLastReport)),
        };
        const total = cumulative[cumulative.length - 1];

        const step = (time: number) => {
            const t = Math.min(1, (time - glide.start) / glide.duration);
            const { position, bearing } = alongPath(glide, t * total);
            // On a road path, face along the street; on a straight hop, turn evenly to the new heading
            const h = roadPath && bearing !== null && t < 1 ? bearing : turnBetween(glide.fromHeading, glide.toHeading, t);
            show(position, h);
            frame.current = t < 1 ? requestAnimationFrame(step) : null;
        };
        stop();
        frame.current = requestAnimationFrame(step);
    }, [bus.lat, bus.lng, bus.heading, bus.route_num]);

    // Stop animating when the marker goes away
    useEffect(() => () => {
        if (frame.current !== null) cancelAnimationFrame(frame.current);
    }, []);
}
