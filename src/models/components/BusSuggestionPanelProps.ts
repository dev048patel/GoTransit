import { TripOption } from '../transit/RoutePlanning';
import { BusPosition } from '../transit/BusPosition';

export interface BusSuggestionPanelProps {
    destination: { lat: number; lng: number; name: string };
    onClose: () => void;
    onSelectRoute?: (option: TripOption) => void;
    liveBuses?: BusPosition[];
}
