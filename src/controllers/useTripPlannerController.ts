/* TripPlanner controller — manages origin GPS, destination autocomplete, route finding, and analytics tracking */
import { useState, useCallback } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { RoutePlanningService } from '../models/services/RoutePlanningService';
import { TripOption } from '../models/transit/RoutePlanning';
import { LocationState } from '../models/transit/LocationState';
import { BusPosition } from '../models/transit/BusPosition';

const routePlanningService = new RoutePlanningService();

export function useTripPlannerController(liveBuses?: BusPosition[]) {
    const [origin, setOrigin] = useState<LocationState | null>(null);
    const [destination, setDestination] = useState<LocationState | null>(null);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [routeResults, setRouteResults] = useState<TripOption[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [showDestSuggestions, setShowDestSuggestions] = useState(false);

    // Google Places autocomplete for destination input
    const {
        ready,
        value: destValue,
        suggestions: { status, data },
        setValue: setDestValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            location: new google.maps.LatLng(50.4452, -104.6189),
            radius: 50 * 1000,
        },
        debounce: 300,
    });

    // Get user's current GPS position as origin
    const handleUseMyLocation = useCallback(() => {
        setGpsLoading(true);
        setGpsError(null);

        if (!navigator.geolocation) {
            setGpsError('Geolocation not supported by your browser');
            setGpsLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setOrigin({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    label: `📍 My Location (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`
                });
                setGpsLoading(false);
                setRouteResults(null);
            },
            (error) => {
                if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
                    // High-accuracy timed out — fall back to network/IP location
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            setOrigin({
                                lat: position.coords.latitude,
                                lng: position.coords.longitude,
                                label: `📍 My Location (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`
                            });
                            setGpsLoading(false);
                            setRouteResults(null);
                        },
                        (fallbackError) => {
                            setGpsError(`Unable to get location: ${fallbackError.message}`);
                            setGpsLoading(false);
                        },
                        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
                    );
                } else {
                    setGpsError(`Unable to get location: ${error.message}`);
                    setGpsLoading(false);
                }
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
        );
    }, []);

    // Geocode selected destination from Places autocomplete
    const handleDestSelect = useCallback(async (description: string) => {
        setDestValue(description, false);
        clearSuggestions();
        setShowDestSuggestions(false);

        try {
            const results = await getGeocode({ address: description });
            const { lat, lng } = await getLatLng(results[0]);
            setDestination({ lat, lng, label: description });
            setRouteResults(null);
        } catch (error) {
            console.error('Error selecting destination:', error);
        }
    }, [setDestValue, clearSuggestions]);

    // Calculate route options between origin and destination
    const handleFindRoutes = useCallback(async () => {
        if (!origin || !destination) return;

        setSearching(true);
        setRouteResults(null);

        try {
            const results = await routePlanningService.calculateTripOptions(
                { lat: origin.lat, lng: origin.lng },
                { lat: destination.lat, lng: destination.lng },
                liveBuses
            );
            setRouteResults(results);

            // Track "directions" event for admin dashboard analytics
            const baseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
            fetch(`${baseUrl}/api/features/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'directions' }),
            }).catch(() => {}); // silent fail — analytics should never break the app
        } catch (error) {
            console.error('Error finding routes:', error);
            setRouteResults([]);
        } finally {
            setSearching(false);
        }
    }, [origin, destination, liveBuses]);

    // Reset all form state and close the modal
    const handleReset = useCallback(() => {
        setOrigin(null);
        setDestination(null);
        setRouteResults(null);
        setGpsError(null);
        setDestValue('', false);
        clearSuggestions();
    }, [setDestValue, clearSuggestions]);

    // Clear origin and reset results
    const clearOrigin = useCallback(() => {
        setOrigin(null);
        setRouteResults(null);
    }, []);

    // Clear destination and reset results
    const clearDestination = useCallback(() => {
        setDestination(null);
        setDestValue('', false);
        setRouteResults(null);
    }, [setDestValue]);

    // Handle destination input changes
    const handleDestInput = useCallback((value: string) => {
        setDestValue(value);
        setShowDestSuggestions(true);
    }, [setDestValue]);

    // Show dropdown on focus if results exist
    const handleDestFocus = useCallback(() => {
        if (data.length > 0) setShowDestSuggestions(true);
    }, [data.length]);

    return {
        origin,
        destination,
        gpsLoading,
        gpsError,
        routeResults,
        searching,
        showDestSuggestions,
        ready,
        destValue,
        status,
        data,
        handleUseMyLocation,
        handleDestSelect,
        handleDestInput,
        handleDestFocus,
        handleFindRoutes,
        handleReset,
        clearOrigin,
        clearDestination,
    };
}
