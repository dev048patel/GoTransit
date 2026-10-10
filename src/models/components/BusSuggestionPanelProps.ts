/* Props interface for the BusSuggestionPanel component — defines trip options, bus positions, and callbacks */
import { TripOption } from '../transit/RoutePlanning';
import { BusPosition } from '../transit/BusPosition';
import type { WeatherSnapshot } from '../services/WeatherService';

export interface BusSuggestionPanelProps {
    destination: { lat: number; lng: number; name: string };
    onClose: () => void;
    onSelectRoute?: (option: TripOption) => void;
    liveBuses?: BusPosition[];
    weather?: WeatherSnapshot | null;
}
