/**
 * LiveBusMarker — one live bus on the map: a top-down bus in its route colour, turned to its heading,
 * gliding smoothly between position reports (see useBusMotionController), with its info window
 * when selected.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { InfoWindow, Marker } from '@react-google-maps/api';
import { BusPosition } from '../../../models/transit/BusPosition';
import { useBusMotionController } from '../../../controllers/useBusMotionController';

/* Stacking: Google Maps puts markers with the same zIndex in front of each other by screen position,
   so two overlapping buses at one shared zIndex kept swapping places as they moved, and blinked.
   Each bus gets its own fixed layer from its id instead, so the order between buses never changes.
   Exported so other markers can sit above every bus. */
const BUS_Z_BASE = 1000;
export const ABOVE_BUSES_Z = 100000;   // bus ids run in the low thousands

// Icons are redrawn only when the heading moves to a new step of this many degrees
const HEADING_STEP_DEG = 4;

const iconCache = new Map<string, google.maps.Icon>();

// Google Maps blanks a marker while its new image loads, so a bus turning to a new heading would vanish
// for a moment. Each new image is decoded here first; until it's ready the bus keeps its current one.
const decodedUrls = new Set<string>();
const decoding = new Map<string, Promise<void>>();
function decodeIcon(url: string): Promise<void> {
    let pending = decoding.get(url);
    if (!pending) {
        const img = new Image();
        img.src = url;
        pending = img.decode().catch(() => undefined).then(() => { decodedUrls.add(url); decoding.delete(url); });
        decoding.set(url, pending);
    }
    return pending;
}

/** On-screen size of the bus in px: the usual size, and bigger only once zoomed in to street level.
 *  One step on purpose: every size change swaps every bus's icon, which makes them blink. */
const busSizeForZoom = (zoom: number) => (zoom >= 16 ? 60 : 40);

/**
 * A bus seen from above, turned to its heading (0 = north, 90 = east). The front reads from the rounded
 * nose, dark windshield and yellow headlights shining ahead, the back from the square tail and red
 * tail lights.
 * The shadow falls the same way whatever the heading, and the route number stays upright on a roof
 * badge. The bus is drawn in 40 units, with 3 spare units round it (so 46 across) for the headlight
 * beams. Everything turns about the centre (20, 20), which is also the marker's anchor, and stays
 * inside the box at any angle (the beams reach 22.8 units out, the box edge is 23).
 */
/** Pixel size of the icon image for a bus drawn `size` px long: the bus plus room for its beams */
const iconBox = (size: number) => Math.round((size * 46) / 40);

function busSvg(color: string, routeNum: string | number, rotation: number, size: number): string {
    const label = String(routeNum);
    const box = iconBox(size);
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${box}" height="${box}" viewBox="-3 -3 46 46">
          <!-- Shadow, offset down-right whichever way the bus faces -->
          <g transform="translate(0.9, 1.4) rotate(${rotation}, 20, 20)">
            <path d="M12 9.5 Q12 4 17 4 L23 4 Q28 4 28 9.5 L28 34.2 Q28 36 26.2 36 L13.8 36 Q12 36 12 34.2 Z" fill="rgba(0,0,0,0.28)"/>
          </g>
          <defs>
            <linearGradient id="beam" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stop-color="#ffff00" stop-opacity="1"/>
              <stop offset="1" stop-color="#ffff00" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <g transform="rotate(${rotation}, 20, 20)">
            <!-- Headlight beams shining ahead of the bus -->
            <path d="M14.2 5 L11.4 -1.2 L18.4 -1.2 L17 5 Z M23 5 L21.6 -1.2 L28.6 -1.2 L25.8 5 Z" fill="url(#beam)"/>
            <!-- Body: rounded nose at the front, square tail at the back -->
            <path d="M12 9.5 Q12 4 17 4 L23 4 Q28 4 28 9.5 L28 34.2 Q28 36 26.2 36 L13.8 36 Q12 36 12 34.2 Z" fill="${color}" stroke="white" stroke-width="1.4" stroke-linejoin="round"/>
            <!-- Windshield across the nose: the only dark part, so the front is unmistakable -->
            <path d="M13.6 11.6 L13.6 9.4 Q13.6 5.5 17.4 5.5 L22.6 5.5 Q26.4 5.5 26.4 9.4 L26.4 11.6 Q20 10 13.6 11.6 Z" fill="#1e293b"/>
            <!-- Headlights -->
            <ellipse cx="15.6" cy="5" rx="2.3" ry="1.2" fill="#ffff00" stroke="#fff59d" stroke-width="0.5"/>
            <ellipse cx="24.4" cy="5" rx="2.3" ry="1.2" fill="#ffff00" stroke="#fff59d" stroke-width="0.5"/>
            <!-- Roof units -->
            <rect x="15" y="14" width="10" height="3.4" rx="1" fill="white" opacity="0.3"/>
            <rect x="15" y="27.6" width="10" height="3" rx="1" fill="white" opacity="0.3"/>
            <!-- Tail lights across the back corners -->
            <rect x="12.8" y="34" width="5" height="1.8" rx="0.9" fill="#ff1744" stroke="#ff8a80" stroke-width="0.4"/>
            <rect x="22.2" y="34" width="5" height="1.8" rx="0.9" fill="#ff1744" stroke="#ff8a80" stroke-width="0.4"/>
          </g>
          <!-- Route number on a roof badge, upright whichever way the bus faces -->
          <circle cx="20" cy="20" r="6.3" fill="white" stroke="rgba(0,0,0,0.15)" stroke-width="0.6"/>
          <text x="20" y="20.4" text-anchor="middle" dominant-baseline="central" font-size="${label.length > 1 ? 7.6 : 8.6}" font-weight="800" fill="${color}" font-family="Arial, Helvetica, sans-serif">${label}</text>
        </svg>`;
}

/** The map icon for a bus, cached per colour/route/heading step/size. */
function busIcon(color: string, routeNum: string | number, heading: number, size: number): google.maps.Icon {
    const rotation = (Math.round(heading / HEADING_STEP_DEG) * HEADING_STEP_DEG) % 360;
    const key = `${color}|${routeNum}|${rotation}|${size}`;
    let icon = iconCache.get(key);
    if (!icon) {
        icon = {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(busSvg(color, routeNum, rotation, size))}`,
            scaledSize: new google.maps.Size(iconBox(size), iconBox(size)),
            anchor: new google.maps.Point(iconBox(size) / 2, iconBox(size) / 2),
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
    /** Current map zoom; sets how big the bus is drawn */
    zoom: number;
    onSelect: () => void;
    onClose: () => void;
}

export default function LiveBusMarker({ bus, color, selected, zoom, onSelect, onClose }: LiveBusMarkerProps) {
    const markerRef = useRef<google.maps.Marker | null>(null);
    const iconRef = useRef<google.maps.Icon | null>(null);
    // Where the marker is first placed. Kept stable so re-renders don't pull it back; after that the
    // motion controller moves it directly.
    const size = busSizeForZoom(zoom);
    const [initial] = useState(() => ({ position: { lat: bus.lat, lng: bus.lng }, icon: busIcon(color, bus.route_num, bus.heading || 0, size) }));
    const latest = useRef<{ position: google.maps.LatLngLiteral; heading: number }>({ position: initial.position, heading: bus.heading || 0 });

    const draw = useCallback((position: google.maps.LatLngLiteral, heading: number) => {
        latest.current = { position, heading };
        const marker = markerRef.current;
        if (!marker) return;
        marker.setPosition(position);
        const icon = busIcon(color, bus.route_num, heading, size);
        if (icon === iconRef.current) return;
        const url = icon.url;
        if (decodedUrls.has(url)) {
            iconRef.current = icon;
            marker.setIcon(icon);
            return;
        }
        // Not loaded yet: keep the current image, and swap once it is if the bus still wants it
        decodeIcon(url).then(() => {
            const wanted = busIcon(color, bus.route_num, latest.current.heading, size);
            if (markerRef.current === marker && wanted.url === url && iconRef.current !== wanted) {
                iconRef.current = wanted;
                marker.setIcon(wanted);
            }
        });
    }, [color, bus.route_num, size]);

    useBusMotionController(bus, draw);

    // Resize a parked bus straight away when the zoom changes, rather than on its next move
    useEffect(() => { draw(latest.current.position, latest.current.heading); }, [draw]);

    const handleLoad = useCallback((marker: google.maps.Marker) => {
        markerRef.current = marker;
        iconRef.current = initial.icon; // what the marker was created with
        draw(latest.current.position, latest.current.heading); // catch up on motion before the marker existed
    }, [draw, initial.icon]);

    return (
        <Marker
            position={initial.position}
            icon={initial.icon}
            title={`Bus #${bus.bus_id} — Route ${bus.route_num} (${bus.line_name})`}
            zIndex={BUS_Z_BASE + bus.bus_id}
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
