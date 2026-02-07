/**
 * RoutePlanningService
 * Simplified bus route planning service for Regina Transit
 * MVP: Finds direct routes only (no transfers)
 */

import transitStops from '../data/transitStops';
import transitRoutes from '../data/transitRoutes';
import { TripOption, RouteSegment } from '../models/RoutePlanning';

interface Location {
    lat: number;
    lng: number;
}

export class RoutePlanningService {
    private readonly WALKING_DISTANCE = 500; // meters
    private readonly AVG_BUS_SPEED = 30; // km/h
    private readonly WALKING_SPEED = 5; // km/h

    /**
     * Calculate trip options from origin to destination
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

        // For MVP: Return simple suggestions based on nearby stops
        // In a full implementation, we would parse route shapes to determine which routes serve which stops
        const tripOptions: TripOption[] = [];

        // Create up to 3 trip options using different nearby stops
        for (let i = 0; i < Math.min(3, originStops.length); i++) {
            const originStop = originStops[i];
            const destStop = destStops[Math.min(i, destStops.length - 1)];

            // Calculate distances
            const walkToStop = this.calculateDistance(origin, {
                lat: parseFloat(originStop.LAT),
                lng: parseFloat(originStop.LON)
            });
            const walkFromStop = this.calculateDistance(destination, {
                lat: parseFloat(destStop.LAT),
                lng: parseFloat(destStop.LON)
            });

            // Estimate bus travel time (simplified)
            const stopDistance = this.calculateDistance(
                { lat: parseFloat(originStop.LAT), lng: parseFloat(originStop.LON) },
                { lat: parseFloat(destStop.LAT), lng: parseFloat(destStop.LON) }
            );

            const busTime = (stopDistance / 1000) / this.AVG_BUS_SPEED * 60; // minutes
            const walkTime = (walkToStop + walkFromStop) / 1000 / this.WALKING_SPEED * 60; // minutes

            // For MVP, suggest any route that might be relevant
            const suggestedRoute = transitRoutes[i % transitRoutes.length];

            const segment: RouteSegment = {
                routeNum: suggestedRoute.ROUTE_NUM,
                routeName: suggestedRoute.ROUTE_NAME,
                fromStop: originStop.STOP_NAME,
                fromStopId: originStop.STOP_ID,
                toStop: destStop.STOP_NAME,
                toStopId: destStop.STOP_ID,
                estimatedTime: Math.round(busTime)
            };

            tripOptions.push({
                segments: [segment],
                totalTime: Math.round(busTime + walkTime),
                transfers: 0,
                walkingDistance: Math.round(walkToStop + walkFromStop),
                originStop: originStop.STOP_NAME,
                destinationStop: destStop.STOP_NAME
            });
        }

        console.log(`[RoutePlanningService] Generated ${tripOptions.length} trip options`);
        return tripOptions.slice(0, 3); // Return top 3
    }

    /**
     * Find stops within walking distance of a location
     */
    private findNearbyStops(location: Location, maxDistance: number): any[] {
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
     * Calculate distance between two locations using Haversine formula
     * Returns distance in meters
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
