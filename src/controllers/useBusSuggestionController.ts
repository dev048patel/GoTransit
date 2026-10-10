/* BusSuggestion controller — handles GPS detection, route calculation, and refresh for the suggestion panel */
import { useState, useEffect, useCallback, useRef } from 'react';
import { RoutePlanningService } from '../models/services/RoutePlanningService';
import { TripOption } from '../models/transit/RoutePlanning';
import { BusPosition } from '../models/transit/BusPosition';

const routePlanningService = new RoutePlanningService();

// Live buses poll every 1.5s; recalculating that often would thrash the planner and the UI,
// so routes are refreshed with the latest bus positions in the background on this interval instead.
const BACKGROUND_REFRESH_MS = 30 * 1000;

interface BusSuggestionInput {
    destination: { lat: number; lng: number; name: string };
    liveBuses?: BusPosition[];
    walkMultiplier?: number;
}

export function useBusSuggestionController({ destination, liveBuses, walkMultiplier = 1.0 }: BusSuggestionInput) {
    const [gpsLoading, setGpsLoading] = useState(true);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
    const [results, setResults] = useState<TripOption[]>([]);
    const [searching, setSearching] = useState(false);       // first search — no results to show yet
    const [updating, setUpdating] = useState(false);         // background refresh — keep showing current results
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Read live buses through a ref so each 1.5s poll doesn't restart the search
    const liveBusesRef = useRef(liveBuses);
    liveBusesRef.current = liveBuses;
    const searchedWithLiveBusesRef = useRef(false);
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
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGpsLoading(false);
            },
            (err) => {
                if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
                    // High-accuracy timed out — fall back to network/IP location
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                            setGpsLoading(false);
                        },
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

    // Calculate route options; background runs keep the current results visible while recalculating
    const findRoutes = useCallback(async (background: boolean) => {
        if (!origin) return;
        const requestId = ++requestIdRef.current;
        if (background) setUpdating(true);
        else setSearching(true);

        const buses = liveBusesRef.current;
        searchedWithLiveBusesRef.current = !!buses?.length;
        routePlanningService.setWalkMultiplier(walkMultiplier);
        try {
            const options = await routePlanningService.calculateTripOptions(
                origin,
                { lat: destLat, lng: destLng },
                buses
            );
            if (requestId !== requestIdRef.current) return; // superseded by a newer search
            setResults(options);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('[BusSuggestionController] Error:', err);
        } finally {
            if (requestId === requestIdRef.current) {
                setSearching(false);
                setUpdating(false);
            }
        }
    }, [origin, destLat, destLng, walkMultiplier]);

    // Full search when origin, destination, or weather walk speed changes
    useEffect(() => {
        if (!origin) return;
        setResults([]);
        findRoutes(false);
    }, [findRoutes, origin]);

    // Periodic background refresh with the latest live bus positions
    useEffect(() => {
        if (!origin) return;
        const interval = setInterval(() => findRoutes(true), BACKGROUND_REFRESH_MS);
        return () => clearInterval(interval);
    }, [findRoutes, origin]);

    // If the first search ran before live buses arrived, refresh once as soon as they do
    const hasLiveBuses = !!liveBuses?.length;
    useEffect(() => {
        if (hasLiveBuses && lastUpdated && !searchedWithLiveBusesRef.current && !searching && !updating) {
            findRoutes(true);
        }
    }, [hasLiveBuses, lastUpdated, searching, updating, findRoutes]);

    // Re-fetch GPS and recalculate routes
    const handleRefresh = useCallback(() => {
        setResults([]);
        detectLocation();
    }, [detectLocation]);

    return { gpsLoading, gpsError, results, searching, updating, lastUpdated, handleRefresh };
}
