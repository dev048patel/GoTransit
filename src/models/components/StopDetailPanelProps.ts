import { Stop } from '../transit/Stop';

export interface StopDetailPanelProps {
    stop: Stop;
    onClose: () => void;
}
