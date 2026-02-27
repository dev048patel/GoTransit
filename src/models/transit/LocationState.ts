/**
 * LocationState
 * A geocoded location with a human-readable label.
 * Used by TripPlannerModal to hold origin / destination state.
 */
export interface LocationState {
    lat: number;
    lng: number;
    label: string;
}
