/*
Data definitions for Transit Stops.
 */
import { StopDirection } from './StopDirection';

export interface Stop {
    OBJECTID: number;
    STOP_ID: string;
    STOP_NAME: string;
    LAT: string; // Provided as string in JSON (e.g. "50.44416")
    LON: string; // Provided as string in JSON (e.g. "-104.54913")
    ONSTREET: string;
    ATSTREET: string;
    DIRECTION: StopDirection | null; // Travel direction of buses at this stop (from the (NB)/(SB)/(EB)/(WB) name suffix)
}
