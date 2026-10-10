/**
 * UserLocationMarker — the "you are here" character on the map.
 *
 * Owns its own GPS watch so a location update re-renders only this marker,
 * not the whole map with every bus and stop.
 *
 *  - character image chosen by the user (useMarkerCharacter)
 *  - accuracy halo sized to the real GPS accuracy
 *  - direction cone while moving (GPS heading)
 *  - glides between fixes; greys out when the signal is lost
 */
import React, { useEffect, useRef, useState } from 'react';
import { OverlayView, useGoogleMap } from '@react-google-maps/api';
import { MARKER_CHARACTERS } from '../../../models/data/markerCharacters';
import { haversineDistance } from '../../../models/services/StopToRouteIndex';
import { useMarkerCharacter } from '../../../controllers/useMarkerCharacter';

interface Fix {
    lat: number;
    lng: number;
    accuracy: number;        // metres
    heading: number | null;  // degrees clockwise from north; null when not moving
}

const MIN_MOVE_METRES = 5;   // GPS jitter below this is ignored
const GLIDE_MS = 800;
const SIZE = 48;             // character size in px

function useGpsFix() {
    const [fix, setFix] = useState<Fix | null>(null);
    const [lost, setLost] = useState(false);

    useEffect(() => {
        if (!navigator.geolocation) return;
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setLost(false);
                const { latitude: lat, longitude: lng, accuracy, heading, speed } = pos.coords;
                const next: Fix = {
                    lat, lng, accuracy,
                    heading: heading != null && !Number.isNaN(heading) && (speed ?? 0) > 0.5 ? heading : null,
                };
                setFix(prev =>
                    prev && haversineDistance(prev.lat, prev.lng, lat, lng) < MIN_MOVE_METRES && prev.heading === next.heading
                        ? prev
                        : next
                );
            },
            (err) => {
                console.warn('Geolocation watch error:', err.message);
                setLost(true);
            },
            { enableHighAccuracy: true, maximumAge: 10000 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    return { fix, lost };
}

/** Animate from the previous position to the new one instead of jumping. */
function useGlide(target: { lat: number; lng: number } | null) {
    const [pos, setPos] = useState(target);
    const current = useRef(target);

    useEffect(() => {
        if (!target) return;
        if (!current.current) {
            // First fix: appear immediately (rAF may not run in a background tab)
            current.current = target;
            setPos(target);
            return;
        }
        const from = current.current;
        const t0 = performance.now();
        let raf = 0;
        const step = (t: number) => {
            const k = Math.min(1, (t - t0) / GLIDE_MS);
            const p = {
                lat: from.lat + (target.lat - from.lat) * k,
                lng: from.lng + (target.lng - from.lng) * k,
            };
            current.current = p;
            setPos(p);
            if (k < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target?.lat, target?.lng]);

    return pos;
}

/** Translucent circle sized to the real GPS accuracy. Drawn imperatively:
 *  the library's <Circle> leaves an orphan behind under React StrictMode. */
function useAccuracyHalo(pos: { lat: number; lng: number } | null, radius: number, lost: boolean) {
    const map = useGoogleMap();
    const halo = useRef<google.maps.Circle | null>(null);

    useEffect(() => {
        if (!map) return;
        const circle = new google.maps.Circle({
            map, clickable: false,
            strokeColor: '#003DA5', strokeOpacity: 0.25, strokeWeight: 1, fillColor: '#003DA5',
        });
        halo.current = circle;
        return () => { circle.setMap(null); halo.current = null; };
    }, [map]);

    useEffect(() => {
        if (!halo.current || !pos) return;
        halo.current.setCenter(pos);
        halo.current.setRadius(radius);
        halo.current.setOptions({ fillOpacity: lost ? 0.04 : 0.1 });
    }, [map, pos?.lat, pos?.lng, radius, lost]);
}

export default function UserLocationMarker() {
    const { fix, lost } = useGpsFix();
    const pos = useGlide(fix);
    const { character } = useMarkerCharacter();
    useAccuracyHalo(pos, fix?.accuracy ?? 0, lost);

    if (!fix || !pos) return null;
    const art = MARKER_CHARACTERS.find(c => c.id === character) ?? MARKER_CHARACTERS[0];

    return (
        <OverlayView
            position={pos}
            mapPaneName={OverlayView.MARKER_LAYER}
        >
            <div
                role="img"
                aria-label={lost ? 'Your last known location' : 'You are here'}
                style={{
                    position: 'relative', width: SIZE, height: SIZE, pointerEvents: 'none',
                    // Anchor the character's base (bottom-centre) on the GPS point
                    transform: 'translate(-50%, -100%)',
                    filter: lost ? 'grayscale(1) opacity(0.6)' : undefined,
                }}
            >
                {/* Direction cone — only while moving */}
                {fix.heading !== null && (
                    <div style={{
                        position: 'absolute', left: '50%', bottom: 0, width: 110, height: 110,
                        transform: `translate(-50%, 50%) rotate(${fix.heading}deg)`,
                        borderRadius: '50%',
                        background: 'conic-gradient(from -28deg, rgba(0,61,165,0.6) 0deg 56deg, transparent 56deg)',
                        WebkitMaskImage: 'radial-gradient(circle, #000 0%, transparent 70%)',
                        maskImage: 'radial-gradient(circle, #000 0%, transparent 70%)',
                    }} />
                )}
                {/* Pulse ring + ground shadow at the feet */}
                {!lost && (
                    <div className="animate-ping" style={{
                        position: 'absolute', left: '50%', bottom: -6, width: 30, height: 12, marginLeft: -15,
                        borderRadius: '50%', background: 'rgba(0,61,165,0.35)',
                    }} />
                )}
                <div style={{
                    position: 'absolute', left: '50%', bottom: -5, width: 30, height: 10, marginLeft: -15,
                    borderRadius: '50%', background: 'rgba(0,0,0,0.28)', filter: 'blur(2px)',
                }} />
                <img
                    src={art.src}
                    alt=""
                    width={SIZE}
                    height={SIZE}
                    draggable={false}
                    className={fix.heading !== null && !lost ? 'marker-walk' : undefined}
                    style={{ position: 'relative', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.3))' }}
                />
            </div>
        </OverlayView>
    );
}

