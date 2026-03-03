/*
 Frontend model for stop prediction data from TransitLive API.
 Each prediction represents a bus's predicted arrival time at a specific stop.
 */

export interface StopPrediction {
    pred_time: string;      // e.g. "01:18 PM"
    intersection: string;   // e.g. "Kramer Blvd @ Darke St"
    bus_id: number;         // e.g. 2402
    stop_id: string;        // e.g. "0251"
    route_id: number;       // e.g. 4
    stop_time_id: number;
    line_name: string;      // e.g. "Hillsdale"
    last_stop: string;      // "0" or "1"
    end_time: string;       // e.g. "06:20 PM"
}
