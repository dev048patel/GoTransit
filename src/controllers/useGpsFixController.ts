// useGpsFixController — live GPS fix for map overlays that follow the user
import { useEffect, useState } from 'react';
import { haversineDistance } from '../models/services/StopToRouteIndex';
import { useLocationConsent } from './useLocationConsent';

export interface GpsFix {
    lat: number;
    lng: number;
    accuracy: number;        // metres
    heading: number | null;  // degrees clockwise from north; null when not moving
}

const MIN_MOVE_METRES = 5;   // GPS jitter below this is ignored

/**
 * Watches the device position. Call it from the component that needs the fix (not from
 * MapView), so a location update re-renders only that component, not the whole map.
 */
export function useGpsFixController() {
    const [fix, setFix] = useState<GpsFix | null>(null);
    const [lost, setLost] = useState(false);
    /* Nothing is watched until the rider taps "Use my location" (see LocationPrompt) */
    const { choice } = useLocationConsent();

    useEffect(() => {
        if (choice !== 'allowed' || !navigator.geolocation) return;
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setLost(false);
                const { latitude: lat, longitude: lng, accuracy, heading, speed } = pos.coords;
                const next: GpsFix = {
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
    }, [choice]);

    return { fix, lost };
}
