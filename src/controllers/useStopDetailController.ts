import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StopPrediction } from '../models/transit/StopPrediction';
import { getRoutesForStop } from '../models/services/StopToRouteIndex';
import transitColors from '../models/data/transitColors';

const REFRESH_INTERVAL_MS = 30_000;

export interface PredictionWithCountdown {
    predTime: string;
    minutesAway: number;
    busId: number | null;
    isLive: boolean;
    isLastStop: boolean;
    intersection: string;
}

export interface RouteGroup {
    routeId: string;
    lineName: string;
    routeColor: string;
    endTime: string;
    predictions: PredictionWithCountdown[];
    hasLiveData: boolean;
}

/**
 * Parse the API time string (12-hour format without AM/PM, e.g. "09:08:36", "01:07:00")
 * into a Date object for today. The API wraps from 12 → 01 after noon,
 * so if the parsed time would be far in the past, add 12h to make it PM.
 */
function parsePredTime(predTimeStr: string): Date {
    const now = new Date();
    const parts = predTimeStr.trim().split(':');
    let hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);

    const predDate = new Date();
    predDate.setHours(hours, minutes, 0, 0);

    // If this time is more than 6 hours in the past, it's likely PM (e.g. "01:07" = 1:07 PM not AM)
    if (predDate.getTime() < now.getTime() - 6 * 60 * 60_000 && hours < 12) {
        predDate.setHours(hours + 12, minutes, 0, 0);
    }

    return predDate;
}

/**
 * Compute minutes until predicted arrival.
 * Returns -1 for predictions more than 5 minutes in the past (stale).
 */
function computeMinutesAway(predTimeStr: string): number {
    const now = new Date();
    const predDate = parsePredTime(predTimeStr);

    const diffMin = Math.round((predDate.getTime() - now.getTime()) / 60_000);
    if (diffMin < -5) return -1;
    return Math.max(0, diffMin);
}

/**
 * Format API time string to 12-hour display with AM/PM (e.g. "01:07:00" → "1:07 PM")
 */
function formatTime12h(predTimeStr: string): string {
    const predDate = parsePredTime(predTimeStr);
    let hours = predDate.getHours();
    const minutes = predDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    if (hours === 0) hours = 12;
    else if (hours > 12) hours -= 12;
    return `${hours}:${minutes} ${ampm}`;
}

function getRouteColor(routeNum: string): string {
    const match = transitColors.find(c => c.route_id === parseInt(routeNum));
    return match ? match.colour : '#1a73e8';
}

/** Deduplicate by stop_time_id (unique per prediction from the API) */
function deduplicatePredictions(preds: StopPrediction[]): StopPrediction[] {
    const seen = new Set<number>();
    return preds.filter(p => {
        if (seen.has(p.stop_time_id)) return false;
        seen.add(p.stop_time_id);
        return true;
    });
}

export function useStopDetailController(stopId: string) {
    const [predictions, setPredictions] = useState<StopPrediction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const hasFetched = useRef(false);

    // All routes serving this stop
    const allRoutes = useMemo(() => Array.from(getRoutesForStop(stopId)), [stopId]);

    const fetchPredictions = useCallback(async () => {
        try {
            setError(null);
            const baseUrl = (import.meta as any).env?.VITE_SERVER_URL || '';

            // Single call — backend uses routes=all&lim=100 to get full day schedule
            const res = await fetch(`${baseUrl}/api/stop-predictions/${stopId}`);
            if (!res.ok) throw new Error('Failed to fetch predictions');
            const preds: StopPrediction[] = await res.json();
            setPredictions(deduplicatePredictions(preds));
            setLastRefreshed(new Date());
        } catch (err) {
            setError('Could not load predictions. Tap refresh to try again.');
            console.error('Stop prediction fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [stopId]);

    // Fetch once on mount / when stopId changes — prevent double call
    useEffect(() => {
        hasFetched.current = false;
    }, [stopId]);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        setLoading(true);
        setPredictions([]);
        fetchPredictions();
    }, [fetchPredictions]);

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(fetchPredictions, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchPredictions]);

    // Group predictions by route, compute countdowns, sort by nearest arrival
    const routeGroups: RouteGroup[] = useMemo(() => {
        const routeIds = Array.from(new Set(predictions.map(p => String(p.route_id))));

        const activeGroups: RouteGroup[] = routeIds.map(routeId => {
            const routePreds = predictions.filter(p => String(p.route_id) === routeId);
            const withCountdown: PredictionWithCountdown[] = routePreds
                .map(p => ({
                    predTime: formatTime12h(p.pred_time),
                    minutesAway: computeMinutesAway(p.pred_time),
                    busId: p.bus_id,
                    isLive: p.bus_id !== null,
                    isLastStop: p.last_stop !== '0' && p.last_stop !== '',
                    intersection: p.intersection,
                }))
                .filter(p => p.minutesAway >= 0)
                .sort((a, b) => a.minutesAway - b.minutesAway);

            return {
                routeId,
                lineName: routePreds[0]?.line_name || '',
                routeColor: getRouteColor(routeId),
                endTime: routePreds[0]?.end_time || '',
                predictions: withCountdown,
                hasLiveData: withCountdown.some(p => p.isLive),
            };
        });

        activeGroups.sort((a, b) => {
            const aMin = a.predictions[0]?.minutesAway ?? Infinity;
            const bMin = b.predictions[0]?.minutesAway ?? Infinity;
            return aMin - bMin;
        });

        // Routes that serve this stop but have no current predictions
        const activeRouteIds = new Set(routeIds);
        const inactiveGroups: RouteGroup[] = allRoutes
            .filter(r => !activeRouteIds.has(r))
            .map(routeId => ({
                routeId,
                lineName: '',
                routeColor: getRouteColor(routeId),
                endTime: '',
                predictions: [],
                hasLiveData: false,
            }));

        return [...activeGroups, ...inactiveGroups];
    }, [predictions, allRoutes]);

    return { routeGroups, allRoutes, loading, error, lastRefreshed, handleRefresh: fetchPredictions };
}
