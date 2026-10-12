/**
 * LiveBusMarker — one live bus on the map: a top-down bus in its route colour, turned to its heading,
 * gliding smoothly between position reports (see useBusMotionController), with its info window
 * when selected.
 */
import React, { useCallback, useRef, useState } from 'react';
import { InfoWindow, Marker } from '@react-google-maps/api';
import { BusPosition } from '../../../models/transit/BusPosition';
import { useBusMotionController } from '../../../controllers/useBusMotionController';

// Icons are redrawn only when the heading moves to a new step of this many degrees
const HEADING_STEP_DEG = 4;

const iconCache = new Map<string, google.maps.Icon>();

/** Top-down bus SVG, rotated to the heading (0 = north, 90 = east). Cached per colour/route/step. */
function busIcon(color: string, routeNum: string | number, heading: number): google.maps.Icon {
    const rotation = (Math.round(heading / HEADING_STEP_DEG) * HEADING_STEP_DEG) % 360;
    const key = `${color}|${routeNum}|${rotation}`;
    let icon = iconCache.get(key);
    if (!icon) {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <g transform="rotate(${rotation}, 20, 20)">
                <!-- Shadow -->
                <ellipse cx="20" cy="20" rx="10" ry="16" fill="rgba(0,0,0,0.15)"/>
                <!-- Bus body -->
                <rect x="11" y="5" width="18" height="30" rx="5" fill="${color}" stroke="white" stroke-width="1.5"/>
                <!-- Windshield (front/top) -->
                <rect x="13" y="6" width="14" height="6" rx="3" fill="white" opacity="0.8"/>
                <!-- Side windows -->
                <rect x="12" y="14" width="4" height="4" rx="1" fill="white" opacity="0.6"/>
                <rect x="24" y="14" width="4" height="4" rx="1" fill="white" opacity="0.6"/>
                <rect x="12" y="20" width="4" height="4" rx="1" fill="white" opacity="0.6"/>
                <rect x="24" y="20" width="4" height="4" rx="1" fill="white" opacity="0.6"/>
                <!-- Rear window -->
                <rect x="14" y="30" width="12" height="3" rx="1.5" fill="white" opacity="0.5"/>
                <!-- Route number -->
                <text x="20" y="29" text-anchor="middle" font-size="8" font-weight="bold" fill="white" font-family="Arial, sans-serif">${routeNum}</text>
              </g>
            </svg>`;
        icon = {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20),
        };
        iconCache.set(key, icon);
    }
    return icon;
}

// Convert heading degrees to compass direction
function compassDirection(heading: number): string {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(heading / 45) % 8];
}

interface LiveBusMarkerProps {
    bus: BusPosition;
    color: string;
    selected: boolean;
    onSelect: () => void;
    onClose: () => void;
}

export default function LiveBusMarker({ bus, color, selected, onSelect, onClose }: LiveBusMarkerProps) {
    const markerRef = useRef<google.maps.Marker | null>(null);
    const iconRef = useRef<google.maps.Icon | null>(null);
    // Where the marker is first placed. Kept stable so re-renders don't pull it back; after that the
    // motion controller moves it directly.
    const [initial] = useState(() => ({ position: { lat: bus.lat, lng: bus.lng }, icon: busIcon(color, bus.route_num, bus.heading || 0) }));
    const latest = useRef<{ position: google.maps.LatLngLiteral; heading: number }>({ position: initial.position, heading: bus.heading || 0 });

    const draw = useCallback((position: google.maps.LatLngLiteral, heading: number) => {
        latest.current = { position, heading };
        const marker = markerRef.current;
        if (!marker) return;
        marker.setPosition(position);
        const icon = busIcon(color, bus.route_num, heading);
        if (icon !== iconRef.current) {
            iconRef.current = icon;
            marker.setIcon(icon);
        }
    }, [color, bus.route_num]);

    useBusMotionController(bus, draw);

    const handleLoad = useCallback((marker: google.maps.Marker) => {
        markerRef.current = marker;
        iconRef.current = null;
        draw(latest.current.position, latest.current.heading); // catch up on motion before the marker existed
    }, [draw]);

    return (
        <Marker
            position={initial.position}
            icon={initial.icon}
            title={`Bus #${bus.bus_id} — Route ${bus.route_num} (${bus.line_name})`}
            zIndex={100}
            onLoad={handleLoad}
            onClick={onSelect}
        >
            {/* Anchored to the marker, so it travels with the bus */}
            {selected && (
                <InfoWindow onCloseClick={onClose}>
                    <div style={{
                        padding: '8px 4px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        minWidth: '200px'
                    }}>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#202124', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                                display: 'inline-block',
                                backgroundColor: color,
                                color: 'white',
                                borderRadius: '6px',
                                padding: '2px 8px',
                                fontSize: '13px',
                                fontWeight: '700'
                            }}>Route {bus.route_num}</span>
                            {bus.line_name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#5f6368', lineHeight: '1.8' }}>
                            <div>🚌 <strong>Bus ID:</strong> {bus.bus_id}</div>
                            <div>🧭 <strong>Heading:</strong> {bus.heading}° ({compassDirection(bus.heading)})</div>
                            <div>💨 <strong>Speed:</strong> {bus.speed > 0 ? `${bus.speed} km/h` : 'Stopped'}</div>
                            <div>📍 <strong>Position:</strong> {bus.lat.toFixed(5)}, {bus.lng.toFixed(5)}</div>
                        </div>
                    </div>
                </InfoWindow>
            )}
        </Marker>
    );
}
