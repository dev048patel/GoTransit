/**
 * Route Planning Models
 * Interfaces for bus route suggestion and trip planning
 */

export interface RouteSegment {
    routeNum: string;
    routeName: string;
    fromStop: string;
    fromStopId: string;
    toStop: string;
    toStopId: string;
    estimatedTime: number; // minutes
}

export interface TripOption {
    segments: RouteSegment[];
    totalTime: number; // minutes
    transfers: number; // 0 for direct, 1 for single transfer
    walkingDistance: number; // meters (walking from origin to first stop + last stop to destination)
    originStop: string; // Name of first stop
    destinationStop: string; // Name of last stop
}

export interface RouteSuggestionRequest {
    origin: {
        lat: number;
        lng: number;
    };
    destination: {
        lat: number;
        lng: number;
    };
}

export interface RouteSuggestionResponse {
    options: TripOption[];
    message?: string; // Optional message if no routes found
}
