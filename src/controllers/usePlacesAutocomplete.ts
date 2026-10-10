/* usePlacesAutocomplete — debounced Places API (New) autocomplete.
   Mirrors the use-places-autocomplete interface (ready, value, suggestions, setValue, clearSuggestions)
   so existing controllers and views keep working, plus getLocation() in place of getGeocode(). */
import { useState, useEffect, useRef, useCallback } from 'react';
import { PlacesService, PlaceSuggestion } from '../models/services/PlacesService';

type SuggestionStatus = '' | 'OK' | 'ZERO_RESULTS' | 'ERROR';

export function usePlacesAutocomplete(debounceMs = 300) {
    const [ready, setReady] = useState(false);
    const [value, setValueState] = useState('');
    const [status, setStatus] = useState<SuggestionStatus>('');
    const [data, setData] = useState<PlaceSuggestion[]>([]);

    const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | undefined>(undefined);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const requestIdRef = useRef(0);
    // Last fetched predictions, kept after clearSuggestions() so getLocation() can reuse the session
    const lastPredictionsRef = useRef<Map<string, google.maps.places.PlacePrediction>>(new Map());

    // Wait for the Places library before enabling the input
    useEffect(() => {
        let cancelled = false;
        PlacesService.load()
            .then(() => { if (!cancelled) setReady(true); })
            .catch(err => console.error('Failed to load Google Places library:', err));
        return () => { cancelled = true; };
    }, []);

    useEffect(() => () => clearTimeout(debounceRef.current), []);

    const clearSuggestions = useCallback(() => {
        clearTimeout(debounceRef.current);
        requestIdRef.current++; // ignore any in-flight response
        setData([]);
        setStatus('');
    }, []);

    const fetchSuggestions = useCallback(async (input: string) => {
        const requestId = ++requestIdRef.current;
        try {
            if (!sessionTokenRef.current) {
                sessionTokenRef.current = await PlacesService.createSessionToken();
            }
            const results = await PlacesService.fetchSuggestions(input, sessionTokenRef.current);
            if (requestId !== requestIdRef.current) return; // a newer request superseded this one

            lastPredictionsRef.current = new Map(results.map(r => [r.place_id, r.prediction]));
            setData(results);
            setStatus(results.length > 0 ? 'OK' : 'ZERO_RESULTS');
        } catch (err) {
            if (requestId !== requestIdRef.current) return;
            console.error('Places autocomplete failed:', err);
            setData([]);
            setStatus('ERROR');
        }
    }, []);

    // Update input text; fetches suggestions (debounced) unless shouldFetch is false
    const setValue = useCallback((next: string, shouldFetch = true) => {
        setValueState(next);
        if (!shouldFetch) return;

        clearTimeout(debounceRef.current);
        if (!next.trim()) {
            clearSuggestions();
            return;
        }
        debounceRef.current = setTimeout(() => fetchSuggestions(next), debounceMs);
    }, [debounceMs, fetchSuggestions, clearSuggestions]);

    // Resolve a selected suggestion to coordinates and end the billing session
    const getLocation = useCallback(async (placeId: string) => {
        const prediction = lastPredictionsRef.current.get(placeId);
        try {
            return await PlacesService.getLocation(placeId, prediction);
        } finally {
            sessionTokenRef.current = undefined; // next keystroke starts a new session
        }
    }, []);

    return {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
        getLocation,
    };
}
