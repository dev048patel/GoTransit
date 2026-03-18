/* Props interface for the TrackingPanel component — defines the active trip and stop-tracking callbacks */
import { TripOption } from '../transit/RoutePlanning';

export interface TrackingPanelProps {
    tripOption: TripOption;
    onStopTracking: () => void;
    onBack?: () => void;
}
