/* Props interface for RouteTrackingOverlay — passes the active trip to render map polylines and markers */
import { TripOption } from './RoutePlanning';

export interface RouteTrackingOverlayProps {
    tripOption: TripOption;
}