/**
 * NearbyStop
 * A transit stop enriched with its walking distance from a query location.
 * Used internally by RoutePlanningService when finding candidate boarding stops.
 */
export interface NearbyStop {
    STOP_ID: string;
    STOP_NAME: string;
    LAT: string;
    LON: string;
    distance: number; // meters from the queried location
    [key: string]: any;
}
