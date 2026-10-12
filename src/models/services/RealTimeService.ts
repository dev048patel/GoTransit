/*
1. Fetches the current bus positions from the external API.
2. Uses a cache-busting timestamp query param.
3. Returns parsed BusPosition objects.
*/

import { BusPosition } from '../transit/BusPosition';

//Handle interaction with the Transit Live Public API.
const SHARE_MS = 500;             // how long one fetched copy is handed to everybody
const UPSTREAM_TIMEOUT_MS = 5000;   // give up on a feed that does not answer

export class RealTimeService {
    private static API_URL = process.env.TRANSIT_LIVE_API_URL;

    // getLiveBuses() is function which returns a promise to return an array of BusPosition objects.
    static getLiveBuses(): Promise<BusPosition[]> {
        // One shared fetch for everybody. The feed changes about every 1.4 s and each map asks every
        // 1.5 s, so a copy at most half a second old looks the same to riders, and TransitLive sees at
        // most two requests a second from us however many riders have the map open.
        if (this.latest && Date.now() - this.latestAt < SHARE_MS) return Promise.resolve(this.latest);
        this.inFlight ??= this.fetchLiveBuses().then(buses => { this.latest = buses; this.latestAt = Date.now(); return buses; })
            .finally(() => { this.inFlight = null; });
        return this.inFlight;
    }

    private static latest: BusPosition[] | null = null;
    private static latestAt = 0;
    private static inFlight: Promise<BusPosition[]> | null = null;

    private static async fetchLiveBuses(): Promise<BusPosition[]> {
        try {
            // Append timestamp to prevent caching.
            const urlWithTime = `${this.API_URL}?_=${Date.now()}`;

            const response = await fetch(urlWithTime, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) }); // making HTTP GET req to API(External) and await for response.

            if (!response.ok) {
                throw new Error(`External API Error: ${response.status} ${response.statusText}`);
            }

            // The API returns a direct JSON array of features.
            // Guard against empty or malformed responses
            const text = await response.text();
            if (!text || text.trim().length === 0) {
                console.warn('Live bus API returned empty response');
                return [];
            }
            let geoJsonData: any[];
            try {
                geoJsonData = JSON.parse(text);
            } catch {
                console.warn('Live bus API returned invalid JSON:', text.substring(0, 100));
                return [];
            }
            // Transform GeoJSON to internal BusPosition model.
            const parsedBuses: BusPosition[] = (geoJsonData as any[]).map((feature: any) => ({
                bus_id: feature.properties.b,
                lat: parseFloat(feature.geometry.coordinates[1]),
                lng: parseFloat(feature.geometry.coordinates[0]),
                heading: feature.properties.dir,
                speed: feature.properties.speed,
                route_num: feature.properties.r, // 'r' stands for route ID/number
                line_name: feature.properties.line
            }));

            return parsedBuses;
        } catch (error) {
            console.error("Failed to fetch live bus data:", error);
            return [];
        }
    }
}
