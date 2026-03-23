import { useState, useEffect, useCallback, useMemo } from 'react';
import { StopPrediction } from '../models/transit/StopPrediction';
import { getRoutesForStop } from '../models/services/StopToRouteIndex';
import transitColors from '../models/data/transitColors';

const REFRESH_INTERVAL_MS = 30_000;

export interface PredictionWithCountdown {
    predTime: string;
    minutesAway: number;
    busId: number;
    isLastStop: boolean;
    intersection: string;
}

export interface RouteGroup {
    routeId: string;
    lineName: string;
    routeColor: string;
    endTime: string;
    predictions: PredictionWithCountdown[];
}

function computeMinutesAway(predTimeStr: string): number {
    const now = new Date();
    const [time, ampm] = predTimeStr.trim().split(' ');
    const [hourStr, minStr] = time.split(':');
    let hours = parseInt(hourStr);
    const minutes = parseInt(minStr);
    if (ampm?.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (ampm?.toUpperCase() === 'AM' && hours === 12) hours = 0;

    const predDate = new Date();
    predDate.setHours(hours, minutes, 0, 0);

    // Handle midnight wrap-around
    if (predDate.getTime() < now.getTime() - 60_000) {
        predDate.setDate(predDate.getDate() + 1);
    }

    return Math.max(0, Math.round((predDate.getTime() - now.getTime()) / 60_000));
}

function getRouteColor(routeNum: string): string {
    const match = transitColors.find(c => c.route_id === parseInt(routeNum));
    return match ? match.colour : '#1a73e8';
}

export function useStopDetailController(stopId: string) {
    const [predictions, setPredictions] = useState<StopPrediction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

    const fetchPredictions = useCallback(async () => {
        try {
            setError(null);
            const baseUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
            const res = await fetch(`${baseUrl}/api/stop-predictions/${stopId}`);
            if (!res.ok) throw new Error('Failed to fetch predictions');
            const preds: StopPrediction[] = await res.json();
            setPredictions(preds);
            setLastRefreshed(new Date());
        } catch (err) {
            setError('Could not load predictions. Tap refresh to try again.');
            console.error('Stop prediction fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [stopId]);

    // Fetch on mount + when stopId changes
    useEffect(() => {
        setLoading(true);
        setPredictions([]);
        fetchPredictions();
    }, [fetchPredictions]);

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(fetchPredictions, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchPredictions]);

    // All routes serving this stop
    const allRoutes = useMemo(() => Array.from(getRoutesForStop(stopId)), [stopId]);

    // Group predictions by route, compute countdowns, sort by nearest arrival
    const routeGroups: RouteGroup[] = useMemo(() => {
        const routeIds = Array.from(new Set(predictions.map(p => String(p.route_id))));

        const groups: RouteGroup[] = routeIds.map(routeId => {
            const routePreds = predictions.filter(p => String(p.route_id) === routeId);
            const withCountdown: PredictionWithCountdown[] = routePreds
                .map(p => ({
                    predTime: p.pred_time,
                    minutesAway: computeMinutesAway(p.pred_time),
                    busId: p.bus_id,
                    isLastStop: p.last_stop === '1',
                    intersection: p.intersection,
                }))
                .sort((a, b) => a.minutesAway - b.minutesAway);

            return {
                routeId,
                lineName: routePreds[0]?.line_name || '',
                routeColor: getRouteColor(routeId),
                endTime: routePreds[0]?.end_time || '',
                predictions: withCountdown,
            };
        });

        // Sort groups by nearest arrival
        groups.sort((a, b) => {
            const aMin = a.predictions[0]?.minutesAway ?? Infinity;
            const bMin = b.predictions[0]?.minutesAway ?? Infinity;
            return aMin - bMin;
        });

        return groups;
    }, [predictions]);

    return { routeGroups, allRoutes, loading, error, lastRefreshed, handleRefresh: fetchPredictions };
}
