/* Navbar controller — handles place selection geocoding and analytics tracking for the search bar */
import { useState, useCallback } from 'react';
import { usePlacesAutocomplete } from './usePlacesAutocomplete';

interface PlaceResult {
    id: string;
    displayName: string;
    location: { lat: number; lng: number };
}

export function useNavbarController(onPlaceSelect?: (place: PlaceResult) => void, onClearPlace?: () => void) {
    const [showResults, setShowResults] = useState(false);

    // Google Places autocomplete hook with Regina-centered search
    const {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
        getLocation,
    } = usePlacesAutocomplete(300);

    // Update search input text and show dropdown
    const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        setShowResults(true);
        // Emptying the box also removes the selected place from the map
        if (e.target.value === '') onClearPlace?.();
    }, [setValue, onClearPlace]);

    // Clear button: empty the search box and remove the selected place from the map
    const handleClear = useCallback(() => {
        setValue('', false);
        clearSuggestions();
        setShowResults(false);
        onClearPlace?.();
    }, [setValue, clearSuggestions, onClearPlace]);

    // Geocode selected place, notify parent, and track analytics event
    const handleSelect = useCallback(async (description: string, placeId: string) => {
        setValue(description, false);
        clearSuggestions();
        setShowResults(false);

        try {
            const { lat, lng } = await getLocation(placeId);

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
    }, [onPlaceSelect, setValue, clearSuggestions, getLocation]);

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
        handleClear,
        handleSelect,
        handleFocus,
    };
}
