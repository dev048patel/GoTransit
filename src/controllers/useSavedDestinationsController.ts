import { useState, useEffect, useCallback } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { useAuth } from '../models/context/AuthContext';
import { SavedDestination } from '../models/transit/SavedDestination';
import { SavedDestinationsService } from '../models/services/SavedDestinationsService';

export type PanelMode = 'list' | 'add';

interface SelectedPlace {
    address: string;
    lat: number;
    lng: number;
    place_id: string;
}

export function useSavedDestinationsController() {
    const { user, isAuthenticated } = useAuth();

    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<PanelMode>('list');
    const [destinations, setDestinations] = useState<SavedDestination[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Add mode
    const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
    const [customName, setCustomName] = useState('');
    const [addError, setAddError] = useState('');
    const [addLoading, setAddLoading] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // Delete confirmation
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const {
        ready,
        value: searchValue,
        suggestions: { status: searchStatus, data: searchData },
        setValue: setSearchValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            location: new google.maps.LatLng(50.4452, -104.6189),
            radius: 50 * 1000,
        },
        debounce: 300,
    });

    useEffect(() => {
        if (!user || !isOpen) return;
        let cancelled = false;
        setLoading(true);
        SavedDestinationsService.getAll(user.id)
            .then(data => { if (!cancelled) setDestinations(data); })
            .catch(() => { if (!cancelled) setError('Failed to load saved locations'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [user?.id, isOpen]);

    const handleOpen = useCallback(() => {
        setIsOpen(true);
        setMode('list');
        setError('');
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setMode('list');
        setSelectedPlace(null);
        setCustomName('');
        setAddError('');
        setDeletingId(null);
        setShowSearchResults(false);
        clearSuggestions();
        setSearchValue('', false);
    }, [clearSuggestions, setSearchValue]);

    const switchToAdd = useCallback(() => {
        setMode('add');
        setSelectedPlace(null);
        setCustomName('');
        setAddError('');
        setSearchValue('', false);
        clearSuggestions();
        setShowSearchResults(false);
    }, [setSearchValue, clearSuggestions]);

    const switchToList = useCallback(() => {
        setMode('list');
        setSelectedPlace(null);
        setCustomName('');
        setAddError('');
        setSearchValue('', false);
        clearSuggestions();
        setShowSearchResults(false);
    }, [setSearchValue, clearSuggestions]);

    const handleSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
        setShowSearchResults(true);
        setSelectedPlace(null);
    }, [setSearchValue]);

    const handlePlaceSelect = useCallback(async (description: string, placeId: string) => {
        setSearchValue(description, false);
        clearSuggestions();
        setShowSearchResults(false);
        try {
            const results = await getGeocode({ address: description });
            const { lat, lng } = await getLatLng(results[0]);
            setSelectedPlace({ address: description, lat, lng, place_id: placeId });
        } catch {
            setAddError('Failed to get location coordinates. Try again.');
        }
    }, [setSearchValue, clearSuggestions]);

    const handleSave = useCallback(async () => {
        if (!selectedPlace) { setAddError('Please search and select a location first.'); return; }
        if (!customName.trim()) { setAddError('Please enter a name for this location.'); return; }
        if (!user) return;
        setAddLoading(true);
        setAddError('');
        try {
            const newDest = await SavedDestinationsService.add(user.id, {
                name: customName.trim(),
                address: selectedPlace.address,
                lat: selectedPlace.lat,
                lng: selectedPlace.lng,
                place_id: selectedPlace.place_id,
            });
            setDestinations(prev => [newDest, ...prev]);
            switchToList();
        } catch (err: any) {
            setAddError(err?.message || 'Failed to save location. Please try again.');
        } finally {
            setAddLoading(false);
        }
    }, [selectedPlace, customName, user, switchToList]);

    const handleReset = useCallback(() => {
        setSelectedPlace(null);
        setCustomName('');
        setAddError('');
        setSearchValue('', false);
        clearSuggestions();
        setShowSearchResults(false);
    }, [setSearchValue, clearSuggestions]);

    const handleDeleteRequest = useCallback((id: string) => {
        setDeletingId(id);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deletingId) return;
        setDeleteLoading(true);
        try {
            await SavedDestinationsService.remove(deletingId);
            setDestinations(prev => prev.filter(d => d.id !== deletingId));
            setDeletingId(null);
        } catch {
            setError('Failed to delete. Please try again.');
        } finally {
            setDeleteLoading(false);
        }
    }, [deletingId]);

    const handleDeleteCancel = useCallback(() => {
        setDeletingId(null);
    }, []);

    const deletingDestination = destinations.find(d => d.id === deletingId) ?? null;

    return {
        isOpen,
        isAuthenticated,
        user,
        mode,
        destinations,
        loading,
        error,
        // Add mode
        ready,
        searchValue,
        searchStatus,
        searchData,
        showSearchResults,
        setShowSearchResults,
        selectedPlace,
        customName,
        setCustomName,
        addError,
        addLoading,
        handleOpen,
        handleClose,
        switchToAdd,
        switchToList,
        handleSearchInput,
        handlePlaceSelect,
        handleSave,
        handleReset,
        // Delete
        deletingId,
        deletingDestination,
        deleteLoading,
        handleDeleteRequest,
        handleDeleteConfirm,
        handleDeleteCancel,
    };
}
