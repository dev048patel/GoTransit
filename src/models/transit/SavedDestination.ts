export interface SavedDestination {
    id: string;
    user_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    place_id: string | null;
    created_at: string;
}
