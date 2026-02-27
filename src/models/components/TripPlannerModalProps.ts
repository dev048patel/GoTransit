import { TripOption } from '../transit/RoutePlanning';
import { BusPosition } from '../transit/BusPosition';

export interface TripPlannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectRoute?: (option: TripOption) => void;
    liveBuses?: BusPosition[];
}
