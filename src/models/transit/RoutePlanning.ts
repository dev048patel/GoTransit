/**
 * Route Planning Models
 * Interfaces for bus route suggestion and trip planning
 */

export interface RouteSegment {
    routeNum: string;
    routeName: string;
    fromStop: string;
    fromStopId: string;
    fromStopLat: number;
    fromStopLng: number;
    toStop: string;
    toStopId: string;
    toStopLat: number;
    toStopLng: number;
    estimatedTime: number; // minutes (bus ride time)
    // Real-time fields (populated when live bus data is available)
    nextBusETA?: number;       // Minutes until next bus arrives at boarding stop
    busDistanceAway?: number;  // Meters between bus and boarding stop along route
    predTime?: string;         // Real predicted arrival time string from API (e.g. "01:18 PM")
    busId?: number;            // Bus vehicle number from predictions API (e.g. 2402)
    intermediateStops?: string[]; // Ordered list of stop names between fromStop and toStop
}

export interface TripOption {
    segments: RouteSegment[];
    totalTime: number; // minutes
    transfers: number; // 0 for direct, 1 for single transfer
    walkingDistance: number; // meters (walking from origin to first stop + last stop to destination + transfer walk)
    walkToFirstStop?: number;  // meters from user's location to the first boarding stop only
    originStop: string; // Name of first stop
    destinationStop: string; // Name of last stop
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
    // Real-time fields
    waitTime?: number;           // Minutes to wait for first bus
    totalTimeWithWait?: number;  // totalTime + waitTime
    isLivePrediction: boolean;   // true if using real bus data
    estimatedArrival?: string;   // Predicted arrival time at destination (e.g. "6:09 PM")
    transferWalkDistance?: number; // meters to walk between different transfer stops
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
