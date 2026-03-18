/* Navbar controller — handles place selection geocoding and analytics tracking for the search bar */
import { useState, useCallback } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';

interface PlaceResult {
    id: string;
    displayName: string;
    location: { lat: number; lng: number };
}

export function useNavbarController(onPlaceSelect?: (place: PlaceResult) => void) {
    const [showResults, setShowResults] = useState(false);

    // Google Places autocomplete hook with Regina-centered search
    const {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            location: new google.maps.LatLng(50.4452, -104.6189),
            radius: 50 * 1000,
        },
        debounce: 300,
    });

    // Update search input text and show dropdown
    const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        setShowResults(true);
    }, [setValue]);

    // Geocode selected place, notify parent, and track analytics event
    const handleSelect = useCallback(async (description: string, placeId: string) => {
        setValue(description, false);
        clearSuggestions();
        setShowResults(false);

        try {
            const results = await getGeocode({ address: description });
            const { lat, lng } = await getLatLng(results[0]);

            if (onPlaceSelect) {
                onPlaceSelect({ id: placeId, displayName: description, location: { lat, lng } });
            }

            // Track "places" event for admin dashboard analytics
            const baseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
            fetch(`${baseUrl}/api/features/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'places' }),
            }).catch(() => {}); // silent fail — analytics should never break the app
        } catch (error) {
            console.error('Error selecting place:', error);
        }
    }, [onPlaceSelect, setValue, clearSuggestions]);

    // Show dropdown when input is focused and there are results
    const handleFocus = useCallback(() => {
        if (data.length > 0) setShowResults(true);
    }, [data.length]);

    return {
        ready,
        value,
        status,
        data,
        showResults,
        handleInput,
        handleSelect,
        handleFocus,
    };
}
