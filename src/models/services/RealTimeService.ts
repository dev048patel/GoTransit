/*
1. Fetches the current bus positions from the external API.
2. Uses a cache-busting timestamp query param.
3. Returns parsed BusPosition objects.
*/

import { BusPosition } from '../transit/BusPosition';

//Handle interaction with the Transit Live Public API.
export class RealTimeService {
    private static API_URL = process.env.TRANSIT_LIVE_API_URL;

    // getLiveBuses() is function which returns a promise to return an array of BusPosition objects.
    static async getLiveBuses(): Promise<BusPosition[]> {
        try {
            // Append timestamp to prevent caching.
            const urlWithTime = `${this.API_URL}?_=${Date.now()}`;

            const response = await fetch(urlWithTime); // making HTTP GET req to API(External) and await for response.

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
