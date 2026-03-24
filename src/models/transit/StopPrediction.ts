/*
 Frontend model for stop prediction data from TransitLive API.
 Each prediction represents a bus's predicted arrival time at a specific stop.
 */

export interface StopPrediction {
    pred_time: string;      // e.g. "08:18 PM"
    intersection: string;   // e.g. "University Of Regina Riddell Centre"
    bus_id: number | null;  // e.g. 2303, null for scheduled (non-live) buses
    stop_id: string;        // e.g. "0270"
    route_id: number;       // e.g. 4
    stop_time_id: number;   // unique ID for deduplication
    line_name: string;      // e.g. "Walsh Acres"
    last_stop: string;      // stop ID of the last stop, or "0" if not last
    end_time: string;       // e.g. "09:05 PM"
}
