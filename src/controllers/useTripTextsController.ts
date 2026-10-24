/**
 * useTripTextsController.ts — Transit Regina  [MVC Controller]
 * One-time trip texts on the tracking panel: once a trip is started, offers to text the rider for it
 * ("leave now", then "get off at the next stop" for each bus), turns the texts on, and stops them when
 * the trip is stopped. Offered to admins only while it is being tried out.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../models/context/AuthContext';
import { SmsService } from '../models/services/SmsService';
import type { TripOption } from '../models/transit/RoutePlanning';

export type TripTextsState = 'ask' | 'starting' | 'on' | 'declined';

export function useTripTextsController(trip: TripOption, destinationName?: string) {
    const { isAdmin } = useAuth();
    const [state, setState] = useState<TripTextsState>('ask');
    const [error, setError] = useState('');
    /** The refusal is fixed on the profile page (verify the number, or turn text alerts on) */
    const [fixOnProfile, setFixOnProfile] = useState(false);
    const [info, setInfo] = useState<{ texts: number; leaveAt: string; textsLeft: number } | null>(null);
    const on = useRef(false);

    // A different trip asks again
    useEffect(() => { setState('ask'); setError(''); setFixOnProfile(false); setInfo(null); }, [trip]);

    const start = useCallback(async () => {
        setState('starting');
        setError('');
        setFixOnProfile(false);
        try {
            const r = await SmsService.startTripTexts({
                legs: trip.segments.map(s => ({ route: s.routeNum, boardStopId: s.fromStopId, alightStopId: s.toStopId })),
                origin: { lat: trip.originLat, lng: trip.originLng },
                destination: { lat: trip.destLat, lng: trip.destLng },
                destinationName: destinationName ?? null,
            });
            setInfo(r);
            setState('on');
            on.current = true;
        } catch (err: any) {
            setError(err?.message ?? 'The texts could not be set up. Try again.');
            setFixOnProfile(err?.code === 'verify_phone' || err?.code === 'opt_in');
            setState('ask');
        }
    }, [trip, destinationName]);

    /** Stops the texts still to come. Call it when the trip is stopped; it does nothing if texts were never on. */
    const stop = useCallback(async () => {
        if (!on.current) return;
        on.current = false;
        setState('declined');
        try { await SmsService.cancelTripTexts(); }
        catch { /* the trip ends anyway; its texts stop being useful once the buses have gone */ }
    }, []);

    return { offered: isAdmin, state, error, fixOnProfile, info, start, decline: () => setState('declined'), stop };
}
