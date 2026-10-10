/* BusSuggestion controller — handles GPS detection, route calculation, and refresh for the suggestion panel */
import { useState, useEffect, useCallback, useRef } from 'react';
import { RoutePlanningService } from '../models/services/RoutePlanningService';
import { TripOption } from '../models/transit/RoutePlanning';

const routePlanningService = new RoutePlanningService();

// Live arrival predictions change minute to minute, so routes are re-ranked with fresh
// predictions in the background on this interval while current results stay visible.
const BACKGROUND_REFRESH_MS = 30 * 1000;

interface BusSuggestionInput {
    destination: { lat: number; lng: number; name: string };
    walkMultiplier?: number;
}

export function useBusSuggestionController({ destination, walkMultiplier = 1.0 }: BusSuggestionInput) {
    const [gpsLoading, setGpsLoading] = useState(true);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
    const [results, setResults] = useState<TripOption[]>([]);
    const [searching, setSearching] = useState(false);       // planning routes — nothing to show yet
    const [updating, setUpdating] = useState(false);         // fetching live arrival times — routes already shown
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const requestIdRef = useRef(0);

    const { lat: destLat, lng: destLng } = destination;

    // Detect GPS location (high accuracy first, then network/IP fallback)
    const detectLocation = useCallback(() => {
        setGpsError(null);
        setGpsLoading(true);
        if (!navigator.geolocation) {
            setGpsError('Geolocation not supported');
            setGpsLoading(false);
            return;
        }
        // Mark the search as started in the same update as the origin, so the panel never
        // flashes "No routes found" between locating the user and starting the search
        const onLocated = (pos: GeolocationPosition) => {
            setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setSearching(true);
            setGpsLoading(false);
        };
        navigator.geolocation.getCurrentPosition(
            onLocated,
            (err) => {
                if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
                    // High-accuracy timed out — fall back to network/IP location
                    navigator.geolocation.getCurrentPosition(
                        onLocated,
                        (fallbackErr) => {
                            setGpsError(`GPS error: ${fallbackErr.message}`);
                            setGpsLoading(false);
                        },
                        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
                    );
                } else {
                    setGpsError(`GPS error: ${err.message}`);
                    setGpsLoading(false);
                }
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
        );
    }, []);

    useEffect(() => { detectLocation(); }, [detectLocation]);

    // Plan routes and show them immediately, then fill in live arrival times.
    // Background runs keep the current results visible while recalculating.
    const findRoutes = useCallback(async (background: boolean) => {
        if (!origin) return;
        const requestId = ++requestIdRef.current;
        const isCurrent = () => requestId === requestIdRef.current;
        if (background) setUpdating(true);
        else setSearching(true);

        routePlanningService.setWalkMultiplier(walkMultiplier);
        try {
            // Let React paint the loading state before the synchronous planning work
            await new Promise(resolve => setTimeout(resolve, 0));
            if (!isCurrent()) return;

            const candidates = routePlanningService.planTrips(origin, { lat: destLat, lng: destLng });
            if (candidates.length === 0) {
                setResults([]);
                setLastUpdated(new Date());
                return;
            }
            if (!background) {
                setResults(routePlanningService.topOptions(candidates));
                setSearching(false);
                setUpdating(true);
            }

            const options = await routePlanningService.addLiveETAs(candidates);
            if (!isCurrent()) return; // superseded by a newer search
            setResults(options);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('[BusSuggestionController] Error:', err);
        } finally {
            if (isCurrent()) {
                setSearching(false);
                setUpdating(false);
            }
        }
    }, [origin, destLat, destLng, walkMultiplier]);

    // Full search when origin, destination, or weather walk speed changes
    useEffect(() => {
        if (!origin) return;
        setResults([]);
        setLastUpdated(null);
        findRoutes(false);
    }, [findRoutes, origin]);

    // Periodic background refresh with the latest arrival predictions
    useEffect(() => {
        if (!origin) return;
        const interval = setInterval(() => findRoutes(true), BACKGROUND_REFRESH_MS);
        return () => clearInterval(interval);
    }, [findRoutes, origin]);

    // Re-fetch GPS and recalculate routes
    const handleRefresh = useCallback(() => {
        setResults([]);
        detectLocation();
    }, [detectLocation]);

    return { gpsLoading, gpsError, results, searching, updating, lastUpdated, handleRefresh };
}
