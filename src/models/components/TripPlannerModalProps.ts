/* Props interface for the TripPlannerModal component — controls modal visibility, trip options, and tracking */
import { TripOption } from '../transit/RoutePlanning';
import { BusPosition } from '../transit/BusPosition';
import type { WeatherSnapshot } from '../services/WeatherService';

export interface TripPlannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectRoute?: (option: TripOption) => void;
    liveBuses?: BusPosition[];
    weather?: WeatherSnapshot | null;
}
