import {TripOption} from './Planner'
export interface BusSuggestionPanelProps {
    destination: { lat: number; lng: number; name: string };
    onClose: () => void;
    onSelectRoute?: (option: TripOption) => void;
}
