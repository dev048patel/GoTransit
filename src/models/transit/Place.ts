/**
 * Place model for Google Places API search results
 */

export interface PlaceResult {
    id: string;
    displayName: string;
    location: {
        lat: number;
        lng: number;
    };
    businessStatus?: string;
}

export interface PlaceSearchRequest {
    query: string;
}

export interface PlaceSearchResponse {
    places: PlaceResult[];
    error?: string;
}
