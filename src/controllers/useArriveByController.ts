/* Arrive-by controller — the scheduled trip that gets the rider to the destination by the time they picked */
import { useEffect, useState } from 'react';
import { fetchArriveByPlan, type ArriveByPlan } from '../models/services/ArriveByClient';

interface ArriveByInput {
    origin: { lat: number; lng: number } | null;
    destination: { lat: number; lng: number };
    /** "HH:MM", or '' while no time is picked */
    time: string;
}

export function useArriveByController({ origin, destination, time }: ArriveByInput) {
    const [plan, setPlan] = useState<ArriveByPlan | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { lat: destLat, lng: destLng } = destination;

    useEffect(() => {
        setPlan(null);
        setError(null);
        if (!origin || !/^\d{1,2}:\d{2}$/.test(time)) return;
        let current = true;
        setLoading(true);
        fetchArriveByPlan(origin, { lat: destLat, lng: destLng }, time)
            .then(p => { if (current) setPlan(p); })
            .catch(() => { if (current) setError("Couldn't plan this trip. Check your connection and try again."); })
            .finally(() => { if (current) setLoading(false); });
        return () => { current = false; };   // a newer time or place replaces this answer
    }, [origin, destLat, destLng, time]);

    return { plan, loading, error };
}
