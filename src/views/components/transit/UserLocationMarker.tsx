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
import { useGpsFixController } from '../../../controllers/useGpsFixController';
import { useMarkerCharacter } from '../../../controllers/useMarkerCharacter';

const GLIDE_MS = 800;
const SIZE = 48;             // character size in px

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
    const { fix, lost } = useGpsFixController();
    const pos = useGlide(fix);
    const { character } = useMarkerCharacter();
    useAccuracyHalo(pos, fix?.accuracy ?? 0, lost);

    if (!fix || !pos) return null;
    const art = MARKER_CHARACTERS.find(c => c.id === character) ?? MARKER_CHARACTERS[0];
    const isDot = art.id === 'default';
    const size = isDot ? 40 : SIZE;

    return (
        <OverlayView
            position={pos}
            mapPaneName={OverlayView.MARKER_LAYER}
        >
            <div
                role="img"
                aria-label={lost ? 'Your last known location' : 'You are here'}
                style={{
                    position: 'relative', width: size, height: size, pointerEvents: 'none',
                    // A character stands on the GPS point (bottom-centre); the plain dot is centred on it
                    transform: isDot ? 'translate(-50%, -50%)' : 'translate(-50%, -100%)',
                    filter: lost ? 'grayscale(1) opacity(0.6)' : undefined,
                }}
            >
                {/* Direction cone — only while moving */}
                {fix.heading !== null && (
                    <div style={{
                        position: 'absolute', left: '50%', bottom: isDot ? size / 2 : 0, width: 110, height: 110,
                        transform: `translate(-50%, 50%) rotate(${fix.heading}deg)`,
                        borderRadius: '50%',
                        background: 'conic-gradient(from -28deg, rgba(0,61,165,0.6) 0deg 56deg, transparent 56deg)',
                        WebkitMaskImage: 'radial-gradient(circle, #000 0%, transparent 70%)',
                        maskImage: 'radial-gradient(circle, #000 0%, transparent 70%)',
                    }} />
                )}
                {/* Pulse ring + ground shadow at the feet */}
                {!lost && !isDot && (
                    <div className="animate-ping" style={{
                        position: 'absolute', left: '50%', bottom: -6, width: 30, height: 12, marginLeft: -15,
                        borderRadius: '50%', background: 'rgba(0,61,165,0.35)',
                    }} />
                )}
                {!isDot && (
                    <div style={{
                        position: 'absolute', left: '50%', bottom: -5, width: 30, height: 10, marginLeft: -15,
                        borderRadius: '50%', background: 'rgba(0,0,0,0.28)', filter: 'blur(2px)',
                    }} />
                )}
                <img
                    src={art.src}
                    alt=""
                    width={size}
                    height={size}
                    draggable={false}
                    className={fix.heading !== null && !lost && !isDot ? 'marker-walk' : undefined}
                    style={{ position: 'relative', filter: isDot ? undefined : 'drop-shadow(0 3px 4px rgba(0,0,0,0.3))' }}
                />
            </div>
        </OverlayView>
    );
}

