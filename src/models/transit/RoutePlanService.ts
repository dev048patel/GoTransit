export interface Location {
    lat: number;
    lng: number;
}

export interface NearbyStop {
    STOP_ID: string;
    STOP_NAME: string;
    LAT: string;
    LON: string;
    distance: number;
    [key: string]: any;
}

