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
import { TripOption } from '../models/RoutePlanning';
import transitShapesData from '../data/transitShapes.json';
import transitColors from '../data/transitColors';

interface RouteTrackingOverlayProps {
    tripOption: TripOption;
}

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
 * Get route shape as individual lines (not flattened) for a given route number.
 * Each line is a separate array of lat/lng points representing one direction or branch.
 */
function getRouteShapeLines(routeNum: string): { lat: number; lng: number }[][] {
    const feature = (transitShapesData as any).features?.find((f: any) =>
        f.properties?.ROUTE_NUM === routeNum ||
        f.properties?.RouteId === routeNum ||
        f.properties?.ROUTE_ID === routeNum
    );

    if (!feature || !feature.geometry?.coordinates) return [];

    return feature.geometry.coordinates.map((line: number[][]) =>
        line.map((coord: number[]) => ({ lat: coord[1], lng: coord[0] }))
    );
}

/**
 * Extract ONLY the portion of a route shape between two stops.
 * Checks each individual line in the MultiLineString separately.
 * STRONGLY prefers forward-direction lines (where fromIdx < toIdx),
 * meaning the bus naturally travels from the boarding stop to the alighting stop.
 * Only falls back to reversed lines if no forward match exists.
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

        const fromIdx = findClosestIdx(line, fromStop);
        const toIdx = findClosestIdx(line, toStop);

        if (fromIdx === toIdx) continue;

        const fromDist = distSq(line[fromIdx], fromStop);
        const toDist = distSq(line[toIdx], toStop);
        const proximity = fromDist + toDist;

        if (fromIdx < toIdx) {
            // Forward direction — bus travels from boarding stop to alighting stop
            forwardCandidates.push({
                segment: line.slice(fromIdx, toIdx + 1),
                proximity
            });
        } else {
            // Reversed — only use as last resort
            reversedCandidates.push({
                segment: line.slice(toIdx, fromIdx + 1).reverse(),
                proximity
            });
        }
    }

    // Pick the best forward candidate; fall back to reversed only if none
    const candidates = forwardCandidates.length > 0 ? forwardCandidates : reversedCandidates;

    if (candidates.length === 0) {
        return [fromStop, toStop];
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
            {tripOption.segments.map((seg, i) => (
                <React.Fragment key={`stops-${i}`}>
                    <Marker
                        position={{ lat: seg.fromStopLat, lng: seg.fromStopLng }}
                        title={seg.fromStop}
                        icon={{
                            path: (window as any).google?.maps?.SymbolPath?.CIRCLE,
                            scale: 8,
                            fillColor: getRouteColor(tripOption.segments[i]?.routeNum),
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
                    {i === tripOption.segments.length - 1 && (
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
            ))}

            {/* Destination marker */}
            <Marker
                position={{ lat: tripOption.destLat, lng: tripOption.destLng }}
                title="Destination"
                zIndex={260}
            />
        </>
    );
}
