/*
  Detour types — modeled after TransitLive's per-route detour API response.
  Endpoint: https://transitlive.com/ajax/detour.php?action=loadDetour&route={routeNum}
*/

export interface DetourApiResponse {
    coordinates: string[][][]; // outer: detour index; middle: polyline points; inner: [lat, lng] strings
    oneWays: string[];         // "0" or "1"
    detourIDs: string[];
    startDates: string[];      // "YYYY-MM-DD HH:MM:SS"
    endDates: string[];        // "YYYY-MM-DD HH:MM:SS"
    showDefault: string[];     // "0" or "1"
    style: { color: string; opacity: number; clickable: boolean };
}

export interface ActiveDetour {
    routeNum: string;
    detourId: string;
    path: { lat: number; lng: number }[]; // parsed lat/lng pairs ready for Polyline
    startDate: Date;
    endDate: Date;
    color: string;
    opacity: number;
}
