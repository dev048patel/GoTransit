/*
 StopPredictionService
 Fetches predicted bus arrival times for a specific stop from TransitLive API.
 Uses the stop_times endpoint which returns real-time predictions.
 */

import { StopPrediction } from '../transit/StopPrediction';

const API_BASE = 'https://transitlive.com/ajax/livemap.php';

export class StopPredictionService {

    /**
     * Fetch predicted arrival times for a specific stop.
     * @param stopId - The stop ID (e.g. "0251")
     * @returns Array of StopPrediction objects with real predicted times
     */
    static async getPredictions(stopId: string, limit?: number): Promise<StopPrediction[]> {
        try {
            let url = `${API_BASE}?action=stop_times&stop=${encodeURIComponent(stopId)}`;
            if (limit) url += `&limit=${limit}`;
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
