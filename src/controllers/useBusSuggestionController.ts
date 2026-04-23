/* BusSuggestion controller — handles GPS detection, route calculation, and refresh for the suggestion panel */
import { useState, useEffect, useCallback } from 'react';
import { RoutePlanningService } from '../models/services/RoutePlanningService';
import { TripOption } from '../models/transit/RoutePlanning';
import { BusPosition } from '../models/transit/BusPosition';

const routePlanningService = new RoutePlanningService();

interface BusSuggestionInput {
    destination: { lat: number; lng: number; name: string };
    liveBuses?: BusPosition[];
}

export function useBusSuggestionController({ destination, liveBuses }: BusSuggestionInput) {
    const [gpsLoading, setGpsLoading] = useState(true);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
    const [results, setResults] = useState<TripOption[]>([]);
    const [searching, setSearching] = useState(false);

    // Detect GPS location on mount
    useEffect(() => {
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

    // Calculate route options once GPS origin is ready
    const findRoutes = useCallback(async () => {
        if (!origin) return;
        setSearching(true);
        try {
            const options = await routePlanningService.calculateTripOptions(
                origin,
                { lat: destination.lat, lng: destination.lng },
                liveBuses
            );
            setResults(options);
        } catch (err) {
            console.error('[BusSuggestionController] Error:', err);
        }
        setSearching(false);
    }, [origin, destination, liveBuses]);

    useEffect(() => {
        if (origin) findRoutes();
    }, [origin, findRoutes]);

    // Re-fetch GPS and recalculate routes
    const handleRefresh = useCallback(() => {
        setGpsError(null);
        setGpsLoading(true);
        setResults([]);
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

    return { gpsLoading, gpsError, results, searching, handleRefresh };
}
