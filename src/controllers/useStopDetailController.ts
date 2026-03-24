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
    hasLiveData: boolean;
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

    // All routes serving this stop (computed early so fetchPredictions can use it)
    const allRoutes = useMemo(() => Array.from(getRoutesForStop(stopId)), [stopId]);
    const routesParam = allRoutes.join(',');

    const fetchPredictions = useCallback(async () => {
        try {
            setError(null);
            const baseUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
            // Fetch per-route predictions for complete departure board data
            const url = `${baseUrl}/api/stop-predictions/${stopId}?routes=${encodeURIComponent(routesParam)}&limit=10`;
            const res = await fetch(url);
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
    }, [stopId, routesParam]);

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

    // Group predictions by route, compute countdowns, sort by nearest arrival
    // Also include routes with no live data as inactive cards
    const routeGroups: RouteGroup[] = useMemo(() => {
        const routeIds = Array.from(new Set(predictions.map(p => String(p.route_id))));

        // Routes with live predictions
        const activeGroups: RouteGroup[] = routeIds.map(routeId => {
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
                hasLiveData: true,
            };
        });

        // Sort active groups by nearest arrival
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
