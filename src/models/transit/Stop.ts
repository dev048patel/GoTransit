/*
Data definitions for Transit Stops.
 */

export interface Stop {
    OBJECTID: number;
    STOP_ID: string;
    STOP_NAME: string;
    LAT: string; // Provided as string in JSON (e.g. "50.44416")
    LON: string; // Provided as string in JSON (e.g. "-104.54913")
    ONSTREET: string;
    ATSTREET: string;
}
