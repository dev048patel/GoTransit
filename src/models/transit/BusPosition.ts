/*
 Frontend model for live bus data.
 */

export interface BusPosition {
    bus_id: number;
    lat: number;
    lng: number;
    heading: number;
    speed: number;
    route_num: number | string;
    line_name: string;
}
