/* Compass travel direction of buses at a stop (Stop.DIRECTION), matching the (NB)/(SB)/(EB)/(WB) stop name suffix */
export type StopDirection = 'NB' | 'SB' | 'EB' | 'WB';

export const STOP_DIRECTION_LABEL: Record<StopDirection, string> = {
    NB: 'Northbound', SB: 'Southbound', EB: 'Eastbound', WB: 'Westbound',
};

export const STOP_DIRECTION_ARROW: Record<StopDirection, string> = {
    NB: '↑', SB: '↓', EB: '→', WB: '←',
};

// Compass heading (degrees clockwise from north) a bus is travelling at a stop of each direction
export const STOP_DIRECTION_HEADING: Record<StopDirection, number> = { NB: 0, EB: 90, SB: 180, WB: 270 };

/**
 * Direction of a stop: its DIRECTION field, or the (NB)/(SB)/(EB)/(WB) name suffix for stop
 * objects that don't carry the field (e.g. served by an older backend). Null when unknown.
 */
export function directionOfStop(stop: { STOP_NAME: string; DIRECTION?: StopDirection | null }): StopDirection | null {
    return stop.DIRECTION ?? (stop.STOP_NAME.match(/\((NB|SB|EB|WB)\)\s*$/)?.[1] as StopDirection | undefined) ?? null;
}
