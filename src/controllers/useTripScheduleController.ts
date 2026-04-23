import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../models/context/AuthContext';
import { SavedDestination } from '../models/transit/SavedDestination';
import { SavedDestinationsService } from '../models/services/SavedDestinationsService';
import { TripOption } from '../models/transit/RoutePlanning';
import { RoutePlanningService } from '../models/services/RoutePlanningService';

const routePlanner = new RoutePlanningService();

export function useTripScheduleController() {
    const { user, isAuthenticated } = useAuth();

    const [isOpen, setIsOpen] = useState(false);
    const [savedDests, setSavedDests] = useState<SavedDestination[]>([]);
    const [destsLoading, setDestsLoading] = useState(false);

    const [fromId, setFromId] = useState<string | null>(null);
    const [toId, setToId] = useState<string | null>(null);
    const [arriveBy, setArriveBy] = useState('08:00');

    const [options, setOptions] = useState<TripOption[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [calculating, setCalculating] = useState(false);
    const [calcError, setCalcError] = useState('');

    useEffect(() => {
        if (!isOpen || !user) return;
        let cancelled = false;
        setDestsLoading(true);
        SavedDestinationsService.getAll(user.id)
            .then(data => { if (!cancelled) setSavedDests(data); })
            .catch(() => {})
            .finally(() => { if (!cancelled) setDestsLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen, user?.id]);

    const handleOpen = useCallback(() => setIsOpen(true), []);
    const handleClose = useCallback(() => setIsOpen(false), []);

    const handleFindBuses = useCallback(async () => {
        if (!fromId || !toId) { setCalcError('Please select both From and To locations.'); return; }
        const from = savedDests.find(d => d.id === fromId);
        const to = savedDests.find(d => d.id === toId);
        if (!from || !to) return;

        setCalculating(true);
        setCalcError('');
        setOptions([]);
        setSelectedIndex(null);
        try {
            const results = await routePlanner.calculateTripOptions(
                { lat: from.lat, lng: from.lng },
                { lat: to.lat, lng: to.lng },
                undefined
            );
            setOptions(results);
            if (results.length > 0) setSelectedIndex(0);
        } catch {
            setCalcError('Could not calculate routes. Please try again.');
        } finally {
            setCalculating(false);
        }
    }, [fromId, toId, savedDests]);

    const handleReset = useCallback(() => {
        setFromId(null);
        setToId(null);
        setArriveBy('08:00');
        setOptions([]);
        setSelectedIndex(null);
        setCalcError('');
    }, []);

    return {
        isOpen,
        isAuthenticated,
        savedDests,
        destsLoading,
        fromId, setFromId,
        toId, setToId,
        arriveBy, setArriveBy,
        options,
        selectedIndex, setSelectedIndex,
        calculating,
        calcError,
        handleOpen,
        handleClose,
        handleFindBuses,
        handleReset,
    };
}
