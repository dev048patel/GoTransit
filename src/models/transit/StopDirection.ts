/* Compass travel direction of buses at a stop (Stop.DIRECTION), matching the (NB)/(SB)/(EB)/(WB) stop name suffix */
export type StopDirection = 'NB' | 'SB' | 'EB' | 'WB';

export const STOP_DIRECTION_LABEL: Record<StopDirection, string> = {
    NB: 'Northbound', SB: 'Southbound', EB: 'Eastbound', WB: 'Westbound',
};
