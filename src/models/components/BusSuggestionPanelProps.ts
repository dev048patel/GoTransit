/* Props interface for the BusSuggestionPanel component — defines trip options, bus positions, and callbacks */
import { TripOption } from '../transit/RoutePlanning';
import { BusPosition } from '../transit/BusPosition';
import type { WeatherSnapshot } from '../services/WeatherService';
import type { MarkerCharacterId } from '../data/markerCharacters';

export interface BusSuggestionPanelProps {
    destination: { lat: number; lng: number; name: string };
    onClose: () => void;
    onSelectRoute?: (option: TripOption) => void;
    liveBuses?: BusPosition[];
    weather?: WeatherSnapshot | null;
    /** The user's map character — sets the panel's wording and the face on each card. */
    character?: MarkerCharacterId;
}
