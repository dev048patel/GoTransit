// useLocationConsent — the rider's choice about sharing their location, shared by every map component
import { useEffect, useState } from 'react';
import { browserAlreadyAllows, getLocationAttempt, getLocationChoice, getLocationProblem, onLocationChoice, onLocationProblem, retryLocation, setLocationChoice, type LocationChoice } from '../models/services/LocationConsent';
import type { LocationProblem } from '../models/services/LocationHelp';

export function useLocationConsent() {
    const [choice, setChoice] = useState<LocationChoice>(getLocationChoice);
    /* What is stopping the location, if anything, and a counter that restarts position watching */
    const [problem, setProblem] = useState<LocationProblem | null>(getLocationProblem);
    const [attempt, setAttempt] = useState(getLocationAttempt);
    useEffect(() => onLocationProblem(() => { setProblem(getLocationProblem()); setAttempt(getLocationAttempt()); }), []);

    useEffect(() => {
        const stop = onLocationChoice(setChoice);
        /* Someone who already allowed location in this browser is not asked again */
        if (getLocationChoice() === null) browserAlreadyAllows().then(yes => { if (yes) setLocationChoice('allowed'); });
        return stop;
    }, []);

    return {
        choice,
        problem,
        attempt,
        /* Saying yes asks the browser straight away, from the tap, so its prompt can appear */
        allow: () => { setLocationChoice('allowed'); void retryLocation(); },
        decline: () => setLocationChoice('declined'),
        retry: retryLocation,
    };
}
