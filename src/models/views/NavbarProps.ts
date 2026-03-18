/* Props interface for the Navbar component — routes list, place selection, and trip planner callbacks */
import { Route } from '../transit/Route';

export interface NavbarProps {
    onPlaceSelect?: (place: any) => void;
    onTripPlannerClick?: () => void;
    routes?: Route[];
    selectedRoute?: string | null;
    onRouteSelect?: (routeNum: string | null) => void;
}
