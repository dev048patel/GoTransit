/**
 * RouteTrackingOverlay
 * Renders map overlays inside <GoogleMap> when route tracking is active:
 * - Dotted Polyline: walking from GPS origin → first bus stop
 * - Solid Polyline: bus route along ACTUAL road shape (only the relevant portion)
 * - Dotted Polyline: walking from last bus stop → destination
 * - Markers: user location (blue pulse), bus stops, destination
 * - Real-time GPS tracking via watchPosition
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Marker, Polyline, Circle } from '@react-google-maps/api';
import transitShapesData from '../../data/transitShapes.json';
import transitColors from '../../data/transitColors';
import { RouteTrackingOverlayProps } from '../../models/transit/RouteTrackingOverlayProps';

/** Squared distance between two points (no need for sqrt for comparison). */
function distSq(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const dlat = a.lat - b.lat;
    const dlng = a.lng - b.lng;
    return dlat * dlat + dlng * dlng;
}

/** Find the index of the closest point on a path to a target. */
function findClosestIdx(path: { lat: number; lng: number }[], target: { lat: number; lng: number }): number {
    let minD = Infinity;
    let best = 0;
    for (let i = 0; i < path.length; i++) {
        const d = distSq(path[i], target);
        if (d < minD) { minD = d; best = i; }
    }
    return best;
}

/**
 * Find the closest point to target within path[startIdx..endIdx] (inclusive).
 * Returns { idx, dist } where dist is squared distance.
 */
function findClosestIdxInRange(
    path: { lat: number; lng: number }[],
    target: { lat: number; lng: number },
    startIdx: number,
    endIdx: number
): { idx: number; dist: number } {
    const lo = Math.max(0, startIdx);
    const hi = Math.min(endIdx, path.length - 1);
    let minD = Infinity;
    let best = lo;
    for (let i = lo; i <= hi; i++) {
        const d = distSq(path[i], target);
        if (d < minD) { minD = d; best = i; }
    }
    return { idx: best, dist: minD };
}

/**
 * Get route shape as individual lines (not flattened) for a given route number.
 * Returns lines from ALL matching shape features (e.g. both NB and SB directions).
 */
function getRouteShapeLines(routeNum: string): { lat: number; lng: number }[][] {
    const features = (transitShapesData as any).features?.filter((f: any) =>
        f.properties?.ROUTE_NUM === routeNum ||
        f.properties?.RouteId === routeNum ||
        f.properties?.ROUTE_ID === routeNum
    ) ?? [];

    if (features.length === 0) return [];

    // Flatten all lines from all matching features (covers both NB and SB shapes)
    return features.flatMap((feature: any) =>
        (feature.geometry?.coordinates ?? []).map((line: number[][]) =>
            line.map((coord: number[]) => ({ lat: coord[1], lng: coord[0] }))
        )
    );
}


/**
 * Extract ONLY the portion of a route shape between two stops.
 * Checks each individual line in the MultiLineString separately.
 *
 * Key fix: when searching for toIdx, we search FORWARD from fromIdx first.
 * This prevents routes that loop back through the same area from drawing
 * an overly long segment (e.g. a Parliament Ave route that goes east past
 * the destination then comes back — we pick the FIRST occurrence of the
 * destination in the direction of travel, not the second/later one).
 *
 * Falls back to backward (reversed) search only if no forward match exists.
 */
function extractShapeSegment(
    fromStop: { lat: number; lng: number },
    toStop: { lat: number; lng: number },
    routeNum: string
): { lat: number; lng: number }[] {
    const lines = getRouteShapeLines(routeNum);

    if (lines.length === 0) {
        return [fromStop, toStop]; // Fallback: straight line
    }

    // Collect candidates: separate forward (correct direction) from reversed
    const forwardCandidates: { segment: { lat: number; lng: number }[]; proximity: number }[] = [];
    const reversedCandidates: { segment: { lat: number; lng: number }[]; proximity: number }[] = [];

    for (const line of lines) {
        if (line.length < 2) continue;

        // Find fromIdx globally — we need the best boarding position on this line
        const fromIdx = findClosestIdx(line, fromStop);
        const fromDist = distSq(line[fromIdx], fromStop);

        // ── Forward search: find toStop AFTER fromIdx ────────────────────────
        // This is the critical fix: searching forward prevents picking a later
        // loop-back occurrence of the same road as the destination.
        if (fromIdx < line.length - 1) {
            const fwd = findClosestIdxInRange(line, toStop, fromIdx + 1, line.length - 1);
            if (fwd.idx > fromIdx) {
                // Check that toStop is actually reasonably close to this line point.
                // Use a generous threshold (0.0005° ≈ ~50m) to allow for GPS offset.
                const proximity = fromDist + fwd.dist;
                forwardCandidates.push({
                    segment: line.slice(fromIdx, fwd.idx + 1),
                    proximity
                });
            }
        }

        // ── Backward search: find toStop BEFORE fromIdx (reversed direction) ─
        // Only used if no forward candidate is found.
        if (fromIdx > 0) {
            const bwd = findClosestIdxInRange(line, toStop, 0, fromIdx - 1);
            if (bwd.idx < fromIdx) {
                const proximity = fromDist + bwd.dist;
                reversedCandidates.push({
                    segment: line.slice(bwd.idx, fromIdx + 1).reverse(),
                    proximity
                });
            }
        }
    }

    // Prefer forward candidates; fall back to reversed only if none found
    const candidates = forwardCandidates.length > 0 ? forwardCandidates : reversedCandidates;

    if (candidates.length === 0) {
        return [fromStop, toStop]; // Straight-line fallback
    }

    // Among candidates, pick the one where both stops are closest to the line
    let best = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
        if (candidates[i].proximity < best.proximity) {
            best = candidates[i];
        }
    }

    return best.segment;
}

export default function RouteTrackingOverlay({ tripOption }: RouteTrackingOverlayProps) {
    const [userPos, setUserPos] = useState<{ lat: number; lng: number }>({
        lat: tripOption.originLat,
        lng: tripOption.originLng
    });
    const watchIdRef = useRef<number | null>(null);

    // Real-time GPS tracking
    useEffect(() => {
        if (!navigator.geolocation) return;

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (err) => console.error('[RouteTrackingOverlay] GPS error:', err),
            { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
        );

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    const firstSeg = tripOption.segments[0];
    const lastSeg = tripOption.segments[tripOption.segments.length - 1];

    // Walking path: user → first bus stop
    const walkToStopPath = [
        userPos,
        { lat: firstSeg.fromStopLat, lng: firstSeg.fromStopLng }
    ];

    // Walking path: last bus stop → destination
    const walkToDestPath = [
        { lat: lastSeg.toStopLat, lng: lastSeg.toStopLng },
        { lat: tripOption.destLat, lng: tripOption.destLng }
    ];

    // Bus route paths — extract only the relevant portion from transit shapes
    const busSegmentPaths = useMemo(() => {
        return tripOption.segments.map(seg =>
            extractShapeSegment(
                { lat: seg.fromStopLat, lng: seg.fromStopLng },
                { lat: seg.toStopLat, lng: seg.toStopLng },
                seg.routeNum
            )
        );
    }, [tripOption]);

    const getRouteColor = (routeNum: string): string => {
        const match = transitColors.find(c => c.route_id === parseInt(routeNum));
        return match ? match.colour : '#1a73e8';
    };

    return (
        <>
            {/* User location – blue pulsing dot */}
            <Circle
                center={userPos}
                radius={12}
                options={{
                    fillColor: '#4285F4',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                    zIndex: 300
                }}
            />
            <Circle
                center={userPos}
                radius={40}
                options={{
                    fillColor: '#4285F4',
                    fillOpacity: 0.15,
                    strokeColor: '#4285F4',
                    strokeOpacity: 0.3,
                    strokeWeight: 1,
                    zIndex: 299
                }}
            />

            {/* Walking to first bus stop (dotted line) */}
            <Polyline
                path={walkToStopPath}
                options={{
                    strokeColor: '#5f6368',
                    strokeOpacity: 0,
                    strokeWeight: 0,
                    icons: [{
                        icon: {
                            path: (window as any).google?.maps?.SymbolPath?.CIRCLE,
                            scale: 4,
                            fillColor: '#5f6368',
                            fillOpacity: 0.8,
                            strokeWeight: 0
                        },
                        offset: '0',
                        repeat: '12px'
                    }],
                    zIndex: 200
                }}
            />

            {/* Bus route segments — only the relevant portion following the road */}
            {busSegmentPaths.map((path, i) => (
                <Polyline
                    key={`bus-seg-${i}`}
                    path={path}
                    options={{
                        strokeColor: getRouteColor(tripOption.segments[i]?.routeNum),
                        strokeOpacity: 0.9,
                        strokeWeight: 6,
                        zIndex: 201
                    }}
                />
            ))}

            {/* Transfer walking segments — dotted orange line between get-off and board stops */}
            {tripOption.segments.slice(0, -1).map((seg, i) => {
                const nextSeg = tripOption.segments[i + 1];
                if (seg.toStopId === nextSeg.fromStopId) return null; // same stop, nothing to draw
                const transferPath = [
                    { lat: seg.toStopLat, lng: seg.toStopLng },
                    { lat: nextSeg.fromStopLat, lng: nextSeg.fromStopLng }
                ];
                return (
                    <Polyline
                        key={`transfer-walk-${i}`}
                        path={transferPath}
                        options={{
                            strokeColor: '#e37400',
                            strokeOpacity: 0,
                            strokeWeight: 0,
                            icons: [{
                                icon: {
                                    path: (window as any).google?.maps?.SymbolPath?.CIRCLE,
                                    scale: 4,
                                    fillColor: '#e37400',
                                    fillOpacity: 0.9,
                                    strokeWeight: 0
                                },
                                offset: '0',
                                repeat: '12px'
                            }],
                            zIndex: 202
                        }}
                    />
                );
            })}

            {/* Walking from last stop to destination (dotted line) */}
            <Polyline
                path={walkToDestPath}
                options={{
                    strokeColor: '#5f6368',
                    strokeOpacity: 0,
                    strokeWeight: 0,
                    icons: [{
                        icon: {
                            path: (window as any).google?.maps?.SymbolPath?.CIRCLE,
                            scale: 4,
                            fillColor: '#5f6368',
                            fillOpacity: 0.8,
                            strokeWeight: 0
                        },
                        offset: '0',
                        repeat: '12px'
                    }],
                    zIndex: 200
                }}
            />

            {/* Bus stop markers */}
            {tripOption.segments.map((seg, i) => {
                const isLastSeg = i === tripOption.segments.length - 1;
                const nextSeg = tripOption.segments[i + 1];
                const isWalkTransfer = !isLastSeg && seg.toStopId !== nextSeg?.fromStopId;
                return (
                    <React.Fragment key={`stops-${i}`}>
                        {/* Boarding stop marker */}
                        <Marker
                            position={{ lat: seg.fromStopLat, lng: seg.fromStopLng }}
                            title={seg.fromStop}
                            icon={{
                                path: (window as any).google?.maps?.SymbolPath?.CIRCLE,
                                scale: 8,
                                fillColor: getRouteColor(seg.routeNum),
                                fillOpacity: 1,
                                strokeWeight: 3,
                                strokeColor: '#ffffff'
                            }}
                            label={{
                                text: `${i + 1}`,
                                color: '#ffffff',
                                fontWeight: 'bold',
                                fontSize: '10px'
                            }}
                            zIndex={250}
                        />

                        {/* Get-off stop marker for walk transfers — orange, between the two bus segments */}
                        {isWalkTransfer && (
                            <Marker
                                position={{ lat: seg.toStopLat, lng: seg.toStopLng }}
                                title={`Get off: ${seg.toStop}`}
                                icon={{
                                    path: (window as any).google?.maps?.SymbolPath?.CIRCLE,
                                    scale: 8,
                                    fillColor: '#e37400',
                                    fillOpacity: 1,
                                    strokeWeight: 3,
                                    strokeColor: '#ffffff'
                                }}
                                zIndex={250}
                            />
                        )}

                        {/* Final alight stop marker (red) */}
                        {isLastSeg && (
                            <Marker
                                position={{ lat: seg.toStopLat, lng: seg.toStopLng }}
                                title={seg.toStop}
                                icon={{
                                    path: (window as any).google?.maps?.SymbolPath?.CIRCLE,
                                    scale: 8,
                                    fillColor: '#ea4335',
                                    fillOpacity: 1,
                                    strokeWeight: 3,
                                    strokeColor: '#ffffff'
                                }}
                                zIndex={250}
                            />
                        )}
                    </React.Fragment>
                );
            })}

            {/* Destination marker */}
            <Marker
                position={{ lat: tripOption.destLat, lng: tripOption.destLng }}
                title="Destination"
                zIndex={260}
            />
        </>
    );
}
