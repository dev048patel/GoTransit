// useTripProgressController — which bus leg of a tracked trip the rider is currently on
import { useState, useEffect } from 'react';
import { TripOption } from '../models/transit/RoutePlanning';
import { Coordinates } from '../models/MapModel';
import { distanceMeters } from '../models/services/StopDirectionIndex';

// Rider counts as having reached a get-off stop within this distance (allows for GPS drift)
const ARRIVAL_RADIUS_M = 75;

/**
 * Starts on the first leg and moves to the next one once the rider reaches the current leg's
 * get-off stop, so the map can highlight the bus they should be on right now.
 * Never moves backwards: legs often double back over the same road (e.g. ride out to a
 * terminus and transfer back), where nearest-leg guesses would flip-flop.
 */
export function useTripProgressController(tripOption: TripOption, userLocation: Coordinates | null) {
    const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

    // A new trip starts from its first leg
    useEffect(() => { setActiveSegmentIndex(0); }, [tripOption]);

    useEffect(() => {
        if (!userLocation) return;
        const segments = tripOption.segments;
        setActiveSegmentIndex(current => {
            let index = current;
            while (
                index < segments.length - 1 &&
                distanceMeters(userLocation, { lat: segments[index].toStopLat, lng: segments[index].toStopLng }) <= ARRIVAL_RADIUS_M
            ) {
                index++;
            }
            return index;
        });
    }, [tripOption, userLocation]);

    return { activeSegmentIndex };
}
