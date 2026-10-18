export interface SavedDestination {
    id: string;
    user_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    place_id: string | null;
    created_at: string;
    /** When lat, lng and address were last fetched from Google (absent before 009_saved_places_refresh.sql is run) */
    cached_at?: string;
}
