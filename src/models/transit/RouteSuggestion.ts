export interface RouteSegment {
    routeNum: string;
    routeName: string;
    fromStop: string;
    toStop: string;
    estimatedTime: number;
}

export interface TripOption {
    segments: RouteSegment[];
    totalTime: number;
    transfers: number;
    walkingDistance: number;
    originStop: string;
    destinationStop: string;
}

export interface RouteSuggestionsProps {
    options: TripOption[];
    onSelectRoute: (option: TripOption) => void;
    onClose: () => void;
}