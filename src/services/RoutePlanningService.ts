/**
 * RoutePlanningService
 * Bus route planning service for Regina Transit
 * Uses StopToRouteIndex for accurate stop-to-route mapping
 * Supports direct routes and 1-transfer routes
 */

import transitStops from '../data/transitStops';
import transitRoutes from '../data/transitRoutes';
import { TripOption, RouteSegment } from '../models/transit/Planner';
import { getRoutesForStop, getStopsForRoute } from './StopToRouteIndex';
import { Location, NearbyStop } from '../models/transit/RoutePlanService';

export class RoutePlanningService {
    private readonly WALKING_DISTANCE = 500; // meters — max walking to a stop
    private readonly AVG_BUS_SPEED = 25; // km/h (city bus average including stops)
    private readonly WALKING_SPEED = 5; // km/h

    /**
     * Calculate trip options from origin to destination.
     * Tries direct routes first, falls back to 1-transfer routes.
     */
    async calculateTripOptions(origin: Location, destination: Location): Promise<TripOption[]> {
        console.log('[RoutePlanningService] Calculating routes from', origin, 'to', destination);

        // Find stops near origin and destination
        const originStops = this.findNearbyStops(origin, this.WALKING_DISTANCE);
        const destStops = this.findNearbyStops(destination, this.WALKING_DISTANCE);

        console.log(`[RoutePlanningService] Found ${originStops.length} origin stops, ${destStops.length} dest stops`);

        if (originStops.length === 0 || destStops.length === 0) {
            console.log('[RoutePlanningService] No nearby stops found');
            return [];
        }

        // Try direct routes first
        const directOptions = this.findDirectRoutes(origin, destination, originStops, destStops);
        console.log(`[RoutePlanningService] Found ${directOptions.length} direct route options`);

        // Collect route numbers already found as direct (to exclude from transfers)
        const directRouteNums = new Set<string>();
        for (const opt of directOptions) {
            for (const seg of opt.segments) {
                directRouteNums.add(seg.routeNum);
            }
        }

        // Find 1-transfer routes, excluding direct route numbers
        let transferOptions: TripOption[] = [];
        if (directOptions.length < 3) {
            transferOptions = this.findTransferRoutes(origin, destination, originStops, destStops, directRouteNums);
            console.log(`[RoutePlanningService] Found ${transferOptions.length} transfer route options`);
        }

        // Combine and rank
        const allOptions = [...directOptions, ...transferOptions];
        allOptions.sort((a, b) => {
            // Prefer fewer transfers
            if (a.transfers !== b.transfers) return a.transfers - b.transfers;
            // Then shorter total time
            if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
            // Then shorter walking distance
            return a.walkingDistance - b.walkingDistance;
        });

        const result = allOptions.slice(0, 3);
        console.log(`[RoutePlanningService] Returning ${result.length} trip options`);
        return result;
    }

    /**
     * Find direct routes (same route serves both origin-stop and dest-stop).
     */
    private findDirectRoutes(
        origin: Location,
        destination: Location,
        originStops: NearbyStop[],
        destStops: NearbyStop[]
    ): TripOption[] {
        const options: TripOption[] = [];
        const seen = new Set<string>(); // Dedup by routeNum

        for (const oStop of originStops) {
            const oRoutes = getRoutesForStop(oStop.STOP_ID);

            for (const dStop of destStops) {
                const dRoutes = getRoutesForStop(dStop.STOP_ID);

                // Set intersection: routes that serve both stops
                for (const routeNum of oRoutes) {
                    if (dRoutes.has(routeNum) && !seen.has(routeNum)) {
                        seen.add(routeNum);

                        const routeInfo = transitRoutes.find(r => r.ROUTE_NUM === routeNum);
                        if (!routeInfo) continue;

                        const walkToStop = oStop.distance;
                        const walkFromStop = dStop.distance;

                        const stopDistance = this.calculateDistance(
                            { lat: parseFloat(oStop.LAT), lng: parseFloat(oStop.LON) },
                            { lat: parseFloat(dStop.LAT), lng: parseFloat(dStop.LON) }
                        );

                        const busTime = (stopDistance / 1000) / this.AVG_BUS_SPEED * 60;
                        const walkTime = ((walkToStop + walkFromStop) / 1000) / this.WALKING_SPEED * 60;

                        const segment: RouteSegment = {
                            routeNum: routeInfo.ROUTE_NUM,
                            routeName: routeInfo.ROUTE_NAME,
                            fromStop: oStop.STOP_NAME,
                            fromStopId: oStop.STOP_ID,
                            fromStopLat: parseFloat(oStop.LAT),
                            fromStopLng: parseFloat(oStop.LON),
                            toStop: dStop.STOP_NAME,
                            toStopId: dStop.STOP_ID,
                            toStopLat: parseFloat(dStop.LAT),
                            toStopLng: parseFloat(dStop.LON),
                            estimatedTime: Math.round(busTime)
                        };

                        options.push({
                            segments: [segment],
                            totalTime: Math.round(busTime + walkTime),
                            transfers: 0,
                            walkingDistance: Math.round(walkToStop + walkFromStop),
                            originStop: oStop.STOP_NAME,
                            destinationStop: dStop.STOP_NAME,
                            originLat: origin.lat,
                            originLng: origin.lng,
                            destLat: destination.lat,
                            destLng: destination.lng
                        });
                    }
                }
            }
        }

        return options;
    }

    /**
     * Find 1-transfer routes by looking for a shared transfer stop
     * between origin routes and destination routes.
     */
    private findTransferRoutes(
        origin: Location,
        destination: Location,
        originStops: NearbyStop[],
        destStops: NearbyStop[],
        excludeRoutes: Set<string> = new Set()
    ): TripOption[] {
        const options: TripOption[] = [];
        const seen = new Set<string>(); // Dedup by "routeA-routeB"

        // Collect all routes from origin stops
        const originRouteMap = new Map<string, NearbyStop>(); // routeNum -> best origin stop
        for (const oStop of originStops) {
            for (const routeNum of getRoutesForStop(oStop.STOP_ID)) {
                if (!originRouteMap.has(routeNum) || oStop.distance < originRouteMap.get(routeNum)!.distance) {
                    originRouteMap.set(routeNum, oStop);
                }
            }
        }

        // Collect all routes from dest stops
        const destRouteMap = new Map<string, NearbyStop>(); // routeNum -> best dest stop
        for (const dStop of destStops) {
            for (const routeNum of getRoutesForStop(dStop.STOP_ID)) {
                if (!destRouteMap.has(routeNum) || dStop.distance < destRouteMap.get(routeNum)!.distance) {
                    destRouteMap.set(routeNum, dStop);
                }
            }
        }

        // For each pair of origin-route and dest-route, find shared transfer stops
        for (const [oRouteNum, oStop] of originRouteMap) {
            const oRouteStops = getStopsForRoute(oRouteNum);

            for (const [dRouteNum, dStop] of destRouteMap) {
                if (oRouteNum === dRouteNum) continue; // Skip same route (that's a direct route)
                // Skip if either leg uses a route already found as direct
                if (excludeRoutes.has(oRouteNum) || excludeRoutes.has(dRouteNum)) continue;

                const key = `${oRouteNum}-${dRouteNum}`;
                if (seen.has(key)) continue;

                const dRouteStops = getStopsForRoute(dRouteNum);

                // Find any shared stop between the two routes
                let bestTransferStop: { id: string; name: string; lat: number; lng: number } | null = null;

                for (const stopId of oRouteStops) {
                    if (dRouteStops.has(stopId)) {
                        const transferStopData = transitStops.find(s => s.STOP_ID === stopId);
                        if (transferStopData) {
                            bestTransferStop = {
                                id: transferStopData.STOP_ID,
                                name: transferStopData.STOP_NAME,
                                lat: parseFloat(transferStopData.LAT),
                                lng: parseFloat(transferStopData.LON)
                            };
                            break; // Take the first shared stop
                        }
                    }
                }

                if (!bestTransferStop) continue;
                seen.add(key);

                const oRouteInfo = transitRoutes.find(r => r.ROUTE_NUM === oRouteNum);
                const dRouteInfo = transitRoutes.find(r => r.ROUTE_NUM === dRouteNum);
                if (!oRouteInfo || !dRouteInfo) continue;

                // Distances for segment 1: origin stop → transfer stop
                const seg1Distance = this.calculateDistance(
                    { lat: parseFloat(oStop.LAT), lng: parseFloat(oStop.LON) },
                    { lat: bestTransferStop.lat, lng: bestTransferStop.lng }
                );
                // Distances for segment 2: transfer stop → dest stop
                const seg2Distance = this.calculateDistance(
                    { lat: bestTransferStop.lat, lng: bestTransferStop.lng },
                    { lat: parseFloat(dStop.LAT), lng: parseFloat(dStop.LON) }
                );

                const seg1Time = (seg1Distance / 1000) / this.AVG_BUS_SPEED * 60;
                const seg2Time = (seg2Distance / 1000) / this.AVG_BUS_SPEED * 60;
                const transferWaitTime = 5; // minutes average wait at transfer
                const walkToStop = oStop.distance;
                const walkFromStop = dStop.distance;
                const walkTime = ((walkToStop + walkFromStop) / 1000) / this.WALKING_SPEED * 60;

                const segment1: RouteSegment = {
                    routeNum: oRouteInfo.ROUTE_NUM,
                    routeName: oRouteInfo.ROUTE_NAME,
                    fromStop: oStop.STOP_NAME,
                    fromStopId: oStop.STOP_ID,
                    fromStopLat: parseFloat(oStop.LAT),
                    fromStopLng: parseFloat(oStop.LON),
                    toStop: bestTransferStop.name,
                    toStopId: bestTransferStop.id,
                    toStopLat: bestTransferStop.lat,
                    toStopLng: bestTransferStop.lng,
                    estimatedTime: Math.round(seg1Time)
                };

                const segment2: RouteSegment = {
                    routeNum: dRouteInfo.ROUTE_NUM,
                    routeName: dRouteInfo.ROUTE_NAME,
                    fromStop: bestTransferStop.name,
                    fromStopId: bestTransferStop.id,
                    fromStopLat: bestTransferStop.lat,
                    fromStopLng: bestTransferStop.lng,
                    toStop: dStop.STOP_NAME,
                    toStopId: dStop.STOP_ID,
                    toStopLat: parseFloat(dStop.LAT),
                    toStopLng: parseFloat(dStop.LON),
                    estimatedTime: Math.round(seg2Time)
                };

                options.push({
                    segments: [segment1, segment2],
                    totalTime: Math.round(seg1Time + seg2Time + transferWaitTime + walkTime),
                    transfers: 1,
                    walkingDistance: Math.round(walkToStop + walkFromStop),
                    originStop: oStop.STOP_NAME,
                    destinationStop: dStop.STOP_NAME,
                    originLat: origin.lat,
                    originLng: origin.lng,
                    destLat: destination.lat,
                    destLng: destination.lng
                });
            }
        }

        return options;
    }

    /**
     * Find stops within walking distance of a location.
     */
    private findNearbyStops(location: Location, maxDistance: number): NearbyStop[] {
        const nearbyStops = transitStops
            .map(stop => ({
                ...stop,
                distance: this.calculateDistance(location, {
                    lat: parseFloat(stop.LAT),
                    lng: parseFloat(stop.LON)
                })
            }))
            .filter(stop => stop.distance <= maxDistance)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5); // Return top 5 closest

        return nearbyStops;
    }

    /**
     * Calculate distance between two locations using Haversine formula.
     * Returns distance in meters.
     */
    private calculateDistance(loc1: Location, loc2: Location): number {
        const R = 6371e3; // Earth radius in meters
        const φ1 = loc1.lat * Math.PI / 180;
        const φ2 = loc2.lat * Math.PI / 180;
        const Δφ = (loc2.lat - loc1.lat) * Math.PI / 180;
        const Δλ = (loc2.lng - loc1.lng) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }
}
