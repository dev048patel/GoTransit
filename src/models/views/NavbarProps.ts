import { Route } from '../transit/Route';

export interface NavbarProps {
    onPlaceSelect?: (place: any) => void;
    onTripPlannerClick?: () => void;
    routes?: Route[];
    selectedRoute?: string | null;
    onRouteSelect?: (routeNum: string | null) => void;
}
