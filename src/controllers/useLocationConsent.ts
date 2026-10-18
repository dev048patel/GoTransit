// useLocationConsent — the rider's choice about sharing their location, shared by every map component
import { useEffect, useState } from 'react';
import { browserAlreadyAllows, getLocationChoice, onLocationChoice, setLocationChoice, type LocationChoice } from '../models/services/LocationConsent';

export function useLocationConsent() {
    const [choice, setChoice] = useState<LocationChoice>(getLocationChoice);

    useEffect(() => {
        const stop = onLocationChoice(setChoice);
        /* Someone who already allowed location in this browser is not asked again */
        if (getLocationChoice() === null) browserAlreadyAllows().then(yes => { if (yes) setLocationChoice('allowed'); });
        return stop;
    }, []);

    return {
        choice,
        allow: () => setLocationChoice('allowed'),
        decline: () => setLocationChoice('declined'),
    };
}
