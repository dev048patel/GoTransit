// Native fetch is available in Node 18+
import { BusPosition } from '../models/BusPosition';

/**
 * Service to handle interaction with the Transit Live Public API.
 */
export class RealTimeService {
    private static API_URL = process.env.TRANSIT_LIVE_TRACKER_API_KEY;

    /**
     * Fetches the current bus positions from the external API.
     * Uses a cache-busting timestamp query param.
     * Returns parsed BusPosition objects.
     */
    static async getLiveBuses(): Promise<BusPosition[]> {
        try {
            // Append timestamp to prevent caching as requested by user
            const urlWithTime = `${this.API_URL}?_=${Date.now()}`;

            console.log(`Fetching live transit data from: ${urlWithTime}`);

            const response = await fetch(urlWithTime);

            if (!response.ok) {
                throw new Error(`External API Error: ${response.status} ${response.statusText}`);
            }

            // The API returns a direct JSON array of features
            const geoJsonData = await response.json();

            // Transform GeoJSON to internal BusPosition model
            const parsedBuses: BusPosition[] = (geoJsonData as any[]).map((feature: any) => ({
                bus_id: feature.properties.b,
                lat: parseFloat(feature.geometry.coordinates[1]),
                lng: parseFloat(feature.geometry.coordinates[0]),
                heading: feature.properties.dir,
                speed: feature.properties.speed,
                route_num: feature.properties.r, // 'r' seems to be the route ID/number
                line_name: feature.properties.line
            }));

            return parsedBuses;
        } catch (error) {
            console.error("Failed to fetch live bus data:", error);
            return [];
        }
    }
}
