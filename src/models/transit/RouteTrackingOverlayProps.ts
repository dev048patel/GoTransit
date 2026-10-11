/* Props interface for RouteTrackingOverlay — passes the active trip to render map polylines and markers */
import { TripOption } from './RoutePlanning';
import { Coordinates } from '../MapModel';

export interface RouteTrackingOverlayProps {
    tripOption: TripOption;
    /** Live GPS position (the map already draws the "you are here" dot for it); null until located */
    userLocation: Coordinates | null;
}