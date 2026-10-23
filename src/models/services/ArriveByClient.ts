/* Asks the backend for the latest scheduled trip that arrives by a time (see ArriveByService) */
import { apiGet } from '../lib/apiClient';
import type { ArriveByPlan, LatLng } from './ArriveByService';

export type { ArriveByPlan, PlannedJourney, PlannedLeg } from './ArriveByService';

/** `time` is "HH:MM" in Regina time, as an <input type="time"> gives it */
export async function fetchArriveByPlan(origin: LatLng, destination: LatLng, time: string): Promise<ArriveByPlan> {
    const q = `from=${origin.lat},${origin.lng}&to=${destination.lat},${destination.lng}&time=${encodeURIComponent(time)}`;
    const res = await apiGet(`/api/plan/arrive-by?${q}`);
    return res.json();
}
