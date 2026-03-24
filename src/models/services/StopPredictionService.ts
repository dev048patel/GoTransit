/*
 StopPredictionService
 Fetches predicted bus arrival times for a specific stop from TransitLive API.
 Uses the stop_times endpoint with routes=all to get full day predictions.
 */

import { StopPrediction } from '../transit/StopPrediction';

const API_BASE = 'https://transitlive.com/ajax/livemap.php';

export class StopPredictionService {

    /**
     * Fetch all predicted arrival times for a specific stop for the full day.
     * Uses routes=all&lim=100&skip=0&ws=1 to get comprehensive schedule data.
     * @param stopId - The stop ID (e.g. "0251")
     * @returns Array of StopPrediction objects
     */
    static async getPredictions(stopId: string): Promise<StopPrediction[]> {
        try {
            const url = `${API_BASE}?action=stop_times&stop=${encodeURIComponent(stopId)}&routes=all&lim=100&skip=0&ws=1`;
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
}
