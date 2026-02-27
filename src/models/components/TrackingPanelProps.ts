import { TripOption } from '../transit/RoutePlanning';

export interface TrackingPanelProps {
    tripOption: TripOption;
    onStopTracking: () => void;
    onBack?: () => void;
}
