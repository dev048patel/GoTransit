/*
 StopPredictionService
 Fetches predicted bus arrival times for a specific stop from TransitLive API.
 Uses the stop_times endpoint which returns real-time predictions.
 */

import { StopPrediction } from '../transit/StopPrediction';

const API_BASE = 'https://transitlive.com/ajax/livemap.php';

export class StopPredictionService {

    /**
     * Fetch predicted arrival times for a specific stop, optionally filtered by route.
     * @param stopId - The stop ID (e.g. "0251")
     * @param options - Optional limit and routeId params
     * @returns Array of StopPrediction objects with real predicted times
     */
    static async getPredictions(stopId: string, options?: { limit?: number; routeId?: string }): Promise<StopPrediction[]> {
        try {
            let url = `${API_BASE}?action=stop_times&stop=${encodeURIComponent(stopId)}`;
            if (options?.limit) url += `&limit=${options.limit}`;
            if (options?.routeId) url += `&route_id=${encodeURIComponent(options.routeId)}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Stop prediction API error: ${response.status}`);
            }

            const data: StopPrediction[] = await response.json();
            return data;
        } catch (error) {
            console.error(`Failed to fetch predictions for stop ${stopId}:`, error);
            return [];
        }
    }

    /**
     * Fetch predictions for a stop across all its routes in parallel.
     * Makes one API call per route with limit, then merges results.
     * @param stopId - The stop ID
     * @param routeIds - Array of route numbers serving this stop
     * @param limit - Max predictions per route
     * @returns Combined array of all predictions
     */
    static async getPredictionsAllRoutes(stopId: string, routeIds: string[], limit: number): Promise<StopPrediction[]> {
        const promises = routeIds.map(routeId =>
            this.getPredictions(stopId, { limit, routeId })
        );
        const results = await Promise.all(promises);
        return results.flat();
    }

    /**
     * Fetch predictions for multiple stops at once.
     * @param stopIds - Array of stop IDs
     * @returns Map of stopId -> predictions
     */
    static async getPredictionsForStops(stopIds: string[]): Promise<Map<string, StopPrediction[]>> {
        const results = new Map<string, StopPrediction[]>();

        // Fetch in parallel for speed
        const promises = stopIds.map(async (stopId) => {
            const predictions = await this.getPredictions(stopId);
            results.set(stopId, predictions);
        });

        await Promise.all(promises);
        return results;
    }
}
