/**
 * RoutePlanningService
 * Bus route planning service for Regina Transit
 * Uses StopToRouteIndex for accurate stop-to-route mapping
 * Supports direct routes and 1-transfer routes
 */

import transitStops from '../data/transitStops';
import transitRoutes from '../data/transitRoutes';
import { TripOption, RouteSegment } from '../transit/RoutePlanning';
import { getRoutesForStop, getStopsForRoute, getOrderedStopsForRoute, getStopPositionOnRoute, checkStopDirection, getGtfsDirectionsForStop } from './StopToRouteIndex';
import { BusPosition } from '../transit/BusPosition';
import { StopPrediction } from '../transit/StopPrediction';
import { Coordinates } from '../MapModel';
import { NearbyStop } from '../transit/NearbyStop';
import { TransferCandidate } from '../transit/TransferCandidate';

export class RoutePlanningService {
    private readonly WALKING_DISTANCE = 500; // meters — max walking to a stop
    private readonly WALKING_DISTANCE_EXPANDED = 800; // meters — first fallback if no stops found
    private readonly WALKING_DISTANCE_EXPANDED_2 = 1500; // meters — second fallback for sparse areas
    private readonly AVG_BUS_SPEED = 25; // km/h (city bus average including stops)
    private readonly WALKING_SPEED = 5; // km/h
    private walkMultiplier = 1.0; // adjusted by WeatherService for cold/icy conditions

    /** Call with WeatherSnapshot.walkMultiplier before planning trips in winter */
    setWalkMultiplier(m: number): void {
        this.walkMultiplier = Math.max(1.0, m);
    }

    /**
     * Calculate trip options from origin to destination.
     * Accepts optional live bus positions for real-time ETA calculation.
     */
    async calculateTripOptions(
        origin: Coordinates,
        destination: Coordinates,
        liveBuses?: BusPosition[]
    ): Promise<TripOption[]> {
        console.log('[RoutePlanningService] Calculating routes from', origin, 'to', destination);
        if (liveBuses) {
            console.log(`[RoutePlanningService] Using ${liveBuses.length} live buses for ETA`);
        }

        // Find stops near origin and destination
        let originStops = this.findNearbyStops(origin, this.WALKING_DISTANCE);
        let destStops = this.findNearbyStops(destination, this.WALKING_DISTANCE);

        // Expand walking radius if no stops found (first fallback: 800m)
        let expandedSearch = false;
        if (originStops.length === 0) {
            originStops = this.findNearbyStops(origin, this.WALKING_DISTANCE_EXPANDED);
            expandedSearch = true;
        }
        if (destStops.length === 0) {
            destStops = this.findNearbyStops(destination, this.WALKING_DISTANCE_EXPANDED);
            expandedSearch = true;
        }

        // Second fallback: 1500m for sparse areas (outskirts, industrial zones)
        if (originStops.length === 0) {
            originStops = this.findNearbyStops(origin, this.WALKING_DISTANCE_EXPANDED_2);
        }
        if (destStops.length === 0) {
            destStops = this.findNearbyStops(destination, this.WALKING_DISTANCE_EXPANDED_2);
        }

        console.log(`[RoutePlanningService] Found ${originStops.length} origin stops, ${destStops.length} dest stops${expandedSearch ? ' (expanded search)' : ''}`);

        if (originStops.length === 0 || destStops.length === 0) {
            console.log('[RoutePlanningService] No nearby stops found');
            return [];
        }

        // Log nearest dest stop distance (diagnostic — helps identify if destination is far from transit)
        const nearestDestDistance = Math.min(...destStops.map(s => s.distance));
        console.log(`[RoutePlanningService] Nearest dest stop is ${Math.round(nearestDestDistance)}m away`);

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

        // When the first bus leg of a transfer is very short (≤5 min), the user could
        // simply walk to the second segment's boarding stop and take just that one bus.
        // Generate those "walkable shortcut" direct options now.
        const shortcuts = this.generateWalkableShortcuts(origin, destination, transferOptions, directRouteNums);
        console.log(`[RoutePlanningService] Generated ${shortcuts.length} walkable shortcut options`);

        // Combine all options
        const allOptions = [...directOptions, ...shortcuts, ...transferOptions];

        // Enrich with real-time predicted arrival times from transit API
        await this.enrichWithLiveETAs(allOptions);

        // Sort by real-time ranking:
        // 1. Prefer routes with live predictions
        // 2. Then by effective time (totalTimeWithWait + 10-min transfer penalty for transfers)
        //    — direct routes win unless the transfer genuinely saves >10 minutes
        // 3. Then fewer transfers (tiebreaker)
        // 4. Then shorter walking distance
        const TRANSFER_PENALTY_MINUTES = 10;
        allOptions.sort((a, b) => {
            // Prefer live predictions first
            if (a.isLivePrediction !== b.isLivePrediction) return a.isLivePrediction ? -1 : 1;
            // Apply transfer penalty so direct routes are preferred unless transfer is much faster
            const aTime = (a.totalTimeWithWait ?? a.totalTime) + (a.transfers > 0 ? TRANSFER_PENALTY_MINUTES : 0);
            const bTime = (b.totalTimeWithWait ?? b.totalTime) + (b.transfers > 0 ? TRANSFER_PENALTY_MINUTES : 0);
            if (aTime !== bTime) return aTime - bTime;
            // Then fewer transfers
            if (a.transfers !== b.transfers) return a.transfers - b.transfers;
            // Then shorter walking distance
            return a.walkingDistance - b.walkingDistance;
        });

        const result = allOptions.slice(0, 5);
        console.log(`[RoutePlanningService] Returning ${result.length} trip options`);
        return result;
    }

    /**
     * Find direct routes (same route serves both origin-stop and dest-stop).
     * Loops by route first, then evaluates all candidate (origin, dest) stop pairs
     * to pick the best directionally-valid combination.
     */
    private findDirectRoutes(
        origin: Coordinates,
        destination: Coordinates,
        originStops: NearbyStop[],
        destStops: NearbyStop[]
    ): TripOption[] {
        const options: TripOption[] = [];
        const seen = new Set<string>(); // Dedup by routeNum

        // Collect all origin stops per route (sorted by distance from origin)
        const routeOriginStops = new Map<string, NearbyStop[]>();
        for (const oStop of originStops) {
            for (const routeNum of getRoutesForStop(oStop.STOP_ID)) {
                if (!routeOriginStops.has(routeNum)) routeOriginStops.set(routeNum, []);
                routeOriginStops.get(routeNum)!.push(oStop);
            }
        }

        // Collect all dest stops per route (sorted by distance from destination)
        const routeDestStops = new Map<string, NearbyStop[]>();
        for (const dStop of destStops) {
            for (const routeNum of getRoutesForStop(dStop.STOP_ID)) {
                if (!routeDestStops.has(routeNum)) routeDestStops.set(routeNum, []);
                routeDestStops.get(routeNum)!.push(dStop);
            }
        }

        // For each route shared between origin and destination areas, find the best
        // (origin stop, dest stop) pair that satisfies direction constraints.
        for (const [routeNum, oCandidates] of routeOriginStops) {
            if (seen.has(routeNum)) continue;
            const dCandidates = routeDestStops.get(routeNum);
            if (!dCandidates) continue;

            const routeInfo = transitRoutes.find(r => r.ROUTE_NUM === routeNum);
            if (!routeInfo) continue;

            // Try all destination stop candidates for this route.
            // For each dStop, filter origin stops by matching GTFS direction_id,
            // then pick the first origin stop that also passes geometric direction check.
            // Track the best overall pair by combined walking distance.
            let bestOStop: NearbyStop | null = null;
            let bestDStop: NearbyStop | null = null;
            let bestShapeDistance = 0;
            let bestWalkTotal = Infinity;

            console.log(`[DEBUG] Route ${routeNum}: ${oCandidates.length} origin, ${dCandidates.length} dest candidates`);

            for (const dStop of dCandidates) {
                // GTFS direction filter: origin must serve same direction_id as this dStop
                const destDirs = getGtfsDirectionsForStop(dStop.STOP_ID, routeNum);
                const dirFiltered = destDirs.length > 0
                    ? oCandidates.filter(c => {
                        const oDirs = getGtfsDirectionsForStop(c.STOP_ID, routeNum);
                        return oDirs.length === 0 || oDirs.some(d => destDirs.includes(d));
                    })
                    : oCandidates;
                // Only fall back to all candidates when we have NO direction data for the destination.
                // When destDirs is non-empty and dirFiltered is empty, every origin stop serves the
                // OPPOSITE direction — using them would suggest a bus going away from the destination.
                const effectiveCandidates = destDirs.length > 0 ? dirFiltered : oCandidates;

                for (const oStop of effectiveCandidates) {
                    // Direction check: oStop must come BEFORE dStop on the route.
                    // Only hard-reject if the check explicitly says INVALID.
                    // Null (inconclusive) is allowed — pre-filter already matched direction_id,
                    // and rejecting null would hide valid routes for stops in GTFS coverage gaps.
                    const dirCheck = checkStopDirection(routeNum, oStop.STOP_ID, dStop.STOP_ID);
                    if (dirCheck && !dirCheck.valid) continue; // explicitly invalid — skip

                    // null → inconclusive (not in GTFS seq or geo); use haversine estimate
                    const shapeDistance = dirCheck?.shapeDistance ?? this.calculateDistance(
                        { lat: parseFloat(oStop.LAT), lng: parseFloat(oStop.LON) },
                        { lat: parseFloat(dStop.LAT), lng: parseFloat(dStop.LON) }
                    );

                    const walkTotal = oStop.distance + dStop.distance;
                    if (walkTotal < bestWalkTotal) {
                        bestOStop = oStop;
                        bestDStop = dStop;
                        bestShapeDistance = shapeDistance;
                        bestWalkTotal = walkTotal;
                    }
                    // Do NOT break — continue checking all origin candidates.
                    // The candidate list is sorted by distance, so we keep the best (min walkTotal) pair.
                }

            }

            if (!bestOStop || !bestDStop) {
                console.log(`[DEBUG] Route ${routeNum}: no valid (o,d) pair found — skipping`);
                continue;
            }
            console.log(`[DEBUG] Route ${routeNum}: best pair o:${bestOStop.STOP_ID} → d:${bestDStop.STOP_ID}`);
            seen.add(routeNum);

            const walkToStop = bestOStop.distance;
            const walkFromStop = bestDStop.distance;

            const busDistanceMeters = bestShapeDistance > 0
                ? bestShapeDistance
                : this.calculateDistance(
                    { lat: parseFloat(bestOStop.LAT), lng: parseFloat(bestOStop.LON) },
                    { lat: parseFloat(bestDStop.LAT), lng: parseFloat(bestDStop.LON) }
                );

            const busTime = (busDistanceMeters / 1000) / this.AVG_BUS_SPEED * 60;
            const walkTime = ((walkToStop + walkFromStop) / 1000) / this.WALKING_SPEED * 60 * this.walkMultiplier;

            const intermediateStops = getOrderedStopsForRoute(routeNum, bestOStop.STOP_ID, bestDStop.STOP_ID);

            const segment: RouteSegment = {
                routeNum: routeInfo.ROUTE_NUM,
                routeName: routeInfo.ROUTE_NAME,
                fromStop: bestOStop.STOP_NAME,
                fromStopId: bestOStop.STOP_ID,
                fromStopLat: parseFloat(bestOStop.LAT),
                fromStopLng: parseFloat(bestOStop.LON),
                toStop: bestDStop.STOP_NAME,
                toStopId: bestDStop.STOP_ID,
                toStopLat: parseFloat(bestDStop.LAT),
                toStopLng: parseFloat(bestDStop.LON),
                estimatedTime: Math.round(busTime),
                intermediateStops: intermediateStops.length > 0 ? intermediateStops : undefined
            };

            options.push({
                segments: [segment],
                totalTime: Math.round(busTime + walkTime),
                transfers: 0,
                walkToFirstStop: Math.round(walkToStop),
                walkingDistance: Math.round(walkToStop + walkFromStop),
                originStop: bestOStop.STOP_NAME,
                destinationStop: bestDStop.STOP_NAME,
                originLat: origin.lat,
                originLng: origin.lng,
                destLat: destination.lat,
                destLng: destination.lng,
                isLivePrediction: false
            });
        }

        return options;
    }


    /**
     * Find 1-transfer routes by looking for a shared transfer stop
     * between origin routes and destination routes.
     */
    private findTransferRoutes(
        origin: Coordinates,
        destination: Coordinates,
        originStops: NearbyStop[],
        destStops: NearbyStop[],
        excludeRoutes: Set<string> = new Set()
    ): TripOption[] {
        const options: TripOption[] = [];
        const seen = new Set<string>(); // Dedup by "routeA-routeB"

        // Collect all routes from origin stops — keep ALL origin stops per route (sorted closest-first).
        // Using all stops (not just the closest) avoids the case where the closest stop is on
        // the wrong side of the road (wrong direction) and all leg1 direction checks fail.
        const originRouteMap = new Map<string, NearbyStop[]>(); // routeNum -> all origin stops
        for (const oStop of originStops) {
            for (const routeNum of getRoutesForStop(oStop.STOP_ID)) {
                if (!originRouteMap.has(routeNum)) originRouteMap.set(routeNum, []);
                originRouteMap.get(routeNum)!.push(oStop);
            }
        }
        // originStops is already sorted by distance, so each array is closest-first

        // Collect all routes from dest stops — keep ALL dest stops per route (sorted closest-first).
        // Critical: a route may serve multiple nearby dest stops on different directions.
        // Picking only the closest can pick a dir-1-only stop that no transfer can reach via dir-0.
        const destRouteMap = new Map<string, NearbyStop[]>(); // routeNum -> all dest stops (closest first)
        for (const dStop of destStops) {
            for (const routeNum of getRoutesForStop(dStop.STOP_ID)) {
                if (!destRouteMap.has(routeNum)) destRouteMap.set(routeNum, []);
                destRouteMap.get(routeNum)!.push(dStop);
            }
        }
        for (const stops of destRouteMap.values()) {
            stops.sort((a, b) => a.distance - b.distance);
        }

        // For each pair of origin-route and dest-route, find shared transfer stops
        for (const [oRouteNum, oOriginStops] of originRouteMap) {
            const oRouteStops = getStopsForRoute(oRouteNum);

            for (const [dRouteNum, dStopCandidates] of destRouteMap) {
                if (oRouteNum === dRouteNum) continue; // Skip same route (that's a direct route)
                // Skip if either leg uses a route already found as direct
                if (excludeRoutes.has(oRouteNum) || excludeRoutes.has(dRouteNum)) continue;

                const key = `${oRouteNum}-${dRouteNum}`;
                if (seen.has(key)) continue;

                const dRouteStops = getStopsForRoute(dRouteNum);

                // Try each dStop candidate (closest first) until one produces a valid transfer.
                // This handles the case where the closest dest stop is dir-1-only while
                // transfer-reachable stops need dir-0 (e.g. Costco Gas Station).
                let foundTransferForPair = false;
                for (const dStop of dStopCandidates) {
                if (foundTransferForPair) break;

                // Find the best transfer: same-stop OR walk-between nearby stops
                const TRANSFER_WALK_MAX = 400; // max meters to walk between transfer stops
                let bestTransfer: TransferCandidate | null = null;

                // Build lookup for dRoute stops with coordinates
                const dRouteStopData = new Map<string, { id: string; name: string; lat: number; lng: number }>();
                for (const dStopId of dRouteStops) {
                    const sd = transitStops.find(s => s.STOP_ID === dStopId);
                    if (sd) dRouteStopData.set(dStopId, {
                        id: sd.STOP_ID, name: sd.STOP_NAME,
                        lat: parseFloat(sd.LAT), lng: parseFloat(sd.LON)
                    });
                }

                for (const oStopId of oRouteStops) {
                    const oStopData = transitStops.find(s => s.STOP_ID === oStopId);
                    if (!oStopData) continue;
                    const oLat = parseFloat(oStopData.LAT);
                    const oLng = parseFloat(oStopData.LON);

                    // Find the best valid origin stop for this transfer candidate.
                    // Try ALL nearby origin stops for this route (sorted closest-first) so we don't
                    // miss valid transfers just because the single closest stop happens to be on
                    // the wrong side of the road (wrong direction).
                    let selectedOriginStop: NearbyStop | null = null;
                    for (const originCandidate of oOriginStops) {
                        const leg1Check = checkStopDirection(oRouteNum, originCandidate.STOP_ID, oStopId);
                        if (leg1Check && !leg1Check.valid) continue; // explicitly invalid — skip
                        // null (inconclusive) or valid — accept
                        selectedOriginStop = originCandidate;
                        break;
                    }
                    if (!selectedOriginStop) continue;

                    // Check this stop against all dRoute stops (same or nearby)
                    for (const [dStopId, dStopInfo] of dRouteStopData) {
                        const walkDist = this.calculateDistance(
                            { lat: oLat, lng: oLng },
                            { lat: dStopInfo.lat, lng: dStopInfo.lng }
                        );

                        // Same stop (walkDist ≈ 0) or within walking distance
                        if (oStopId !== dStopId && walkDist > TRANSFER_WALK_MAX) continue;

                        // Same stop ID means gtfsStopRoutes.json confirms both routes call here —
                        // no further check needed. The GTFS stop_times data is authoritative.

                        // --- GTFS direction filter for leg 2 boarding stop ---
                        // Ensure the boarding stop (dStopId) serves the same direction
                        // as the destination stop (dStop) on the destination route.
                        if (dStopId !== dStop.STOP_ID) {
                            const destDirs2 = getGtfsDirectionsForStop(dStop.STOP_ID, dRouteNum);
                            if (destDirs2.length > 0) {
                                const boardDirs = getGtfsDirectionsForStop(dStopId, dRouteNum);
                                // If we have direction data for the boarding stop and it doesn't
                                // match the destination direction, skip this boarding stop.
                                if (boardDirs.length > 0 && !boardDirs.some(d => destDirs2.includes(d))) {
                                    continue;
                                }
                            }
                        }

                        // Verify direction: board stop → dest stop on route B
                        // Allow null (inconclusive) — pre-filter already matched direction_id.
                        const leg2Dir = checkStopDirection(dRouteNum, dStopId, dStop.STOP_ID);
                        if (leg2Dir && !leg2Dir.valid) continue;

                        // Score = penalty-weighted detour (origin→getOff + walk×penalty + board→dest).
                        // Transfer walking is penalized 3× relative to riding the same distance on a bus.
                        // This ensures the algorithm strongly prefers boarding the NEAREST stop for
                        // the connecting route rather than staying on the first bus longer to reach a
                        // shared stop that happens to save a few metres of bus distance.
                        //
                        // Math: for a 50m-walk option to beat a 242m-walk option, we need P > 1.26.
                        // P = 3 gives comfortable headroom for any real-world near-stop scenario.
                        const TRANSFER_WALK_PENALTY = 3;
                        const detour = this.calculateDistance(
                            { lat: parseFloat(selectedOriginStop.LAT), lng: parseFloat(selectedOriginStop.LON) },
                            { lat: oLat, lng: oLng }
                        ) + walkDist * TRANSFER_WALK_PENALTY + this.calculateDistance(
                            { lat: dStopInfo.lat, lng: dStopInfo.lng },
                            { lat: parseFloat(dStop.LAT), lng: parseFloat(dStop.LON) }
                        );

                        const actualWalkDist = oStopId === dStopId ? 0 : Math.round(walkDist);
                        const isBetter = !bestTransfer || detour < bestTransfer.detour;
                        if (isBetter) {
                            bestTransfer = {
                                getOffId: oStopId, getOffName: oStopData.STOP_NAME,
                                getOffLat: oLat, getOffLng: oLng,
                                boardId: dStopId, boardName: dStopInfo.name,
                                boardLat: dStopInfo.lat, boardLng: dStopInfo.lng,
                                walkDist: actualWalkDist,
                                detour,
                                selectedOriginStop,
                            };
                        }
                    }
                }

                if (!bestTransfer) continue; // try next dStop candidate
                seen.add(key);

                const oRouteInfo = transitRoutes.find(r => r.ROUTE_NUM === oRouteNum);
                const dRouteInfo = transitRoutes.find(r => r.ROUTE_NUM === dRouteNum);
                if (!oRouteInfo || !dRouteInfo) continue;

                const originStop = bestTransfer.selectedOriginStop;

                // Distances for segment 1: origin stop → getOff stop
                const seg1Distance = this.calculateDistance(
                    { lat: parseFloat(originStop.LAT), lng: parseFloat(originStop.LON) },
                    { lat: bestTransfer.getOffLat, lng: bestTransfer.getOffLng }
                );
                // Distances for segment 2: board stop → dest stop
                const seg2Distance = this.calculateDistance(
                    { lat: bestTransfer.boardLat, lng: bestTransfer.boardLng },
                    { lat: parseFloat(dStop.LAT), lng: parseFloat(dStop.LON) }
                );

                const seg1Time = (seg1Distance / 1000) / this.AVG_BUS_SPEED * 60;
                const seg2Time = (seg2Distance / 1000) / this.AVG_BUS_SPEED * 60;
                const transferWalkTime = bestTransfer.walkDist > 0
                    ? (bestTransfer.walkDist / 1000) / this.WALKING_SPEED * 60 * this.walkMultiplier
                    : 0;
                const transferWaitTime = 5; // minutes average wait at transfer
                const walkToStop = originStop.distance;
                const walkFromStop = dStop.distance;
                const walkTime = ((walkToStop + walkFromStop) / 1000) / this.WALKING_SPEED * 60 * this.walkMultiplier;

                const seg1IntermediateStops = getOrderedStopsForRoute(oRouteNum, originStop.STOP_ID, bestTransfer.getOffId);

                const segment1: RouteSegment = {
                    routeNum: oRouteInfo.ROUTE_NUM,
                    routeName: oRouteInfo.ROUTE_NAME,
                    fromStop: originStop.STOP_NAME,
                    fromStopId: originStop.STOP_ID,
                    fromStopLat: parseFloat(originStop.LAT),
                    fromStopLng: parseFloat(originStop.LON),
                    toStop: bestTransfer.getOffName,
                    toStopId: bestTransfer.getOffId,
                    toStopLat: bestTransfer.getOffLat,
                    toStopLng: bestTransfer.getOffLng,
                    estimatedTime: Math.round(seg1Time),
                    intermediateStops: seg1IntermediateStops.length > 0 ? seg1IntermediateStops : undefined
                };

                const seg2IntermediateStops = getOrderedStopsForRoute(dRouteNum, bestTransfer.boardId, dStop.STOP_ID);

                const segment2: RouteSegment = {
                    routeNum: dRouteInfo.ROUTE_NUM,
                    routeName: dRouteInfo.ROUTE_NAME,
                    fromStop: bestTransfer.boardName,
                    fromStopId: bestTransfer.boardId,
                    fromStopLat: bestTransfer.boardLat,
                    fromStopLng: bestTransfer.boardLng,
                    toStop: dStop.STOP_NAME,
                    toStopId: dStop.STOP_ID,
                    toStopLat: parseFloat(dStop.LAT),
                    toStopLng: parseFloat(dStop.LON),
                    estimatedTime: Math.round(seg2Time),
                    intermediateStops: seg2IntermediateStops.length > 0 ? seg2IntermediateStops : undefined
                };

                options.push({
                    segments: [segment1, segment2],
                    totalTime: Math.round(seg1Time + seg2Time + transferWaitTime + transferWalkTime + walkTime),
                    transfers: 1,
                    walkToFirstStop: Math.round(walkToStop),
                    walkingDistance: Math.round(walkToStop + walkFromStop + bestTransfer.walkDist),
                    originStop: originStop.STOP_NAME,
                    destinationStop: dStop.STOP_NAME,
                    originLat: origin.lat,
                    originLng: origin.lng,
                    destLat: destination.lat,
                    destLng: destination.lng,
                    isLivePrediction: false,
                    transferWalkDistance: bestTransfer.walkDist > 0 ? bestTransfer.walkDist : undefined
                });
                foundTransferForPair = true; // Stop trying further dStop candidates for this pair
                } // end dStop loop
            }
        }

        return options;
    }

    /**
     * Generate walkable shortcut options from transfer routes.
     *
     * When a transfer route's first bus segment is very short (≤5 min), the user
     * can skip it entirely and walk directly to the second segment's boarding stop
     * for a simpler, no-transfer trip.  This is the "optimized" suggestion when
     * the boarding stop for the main bus is reachable on foot from the origin.
     */
    private generateWalkableShortcuts(
        origin: Coordinates,
        destination: Coordinates,
        transferOptions: TripOption[],
        directRouteNums: Set<string>
    ): TripOption[] {
        const shortcuts: TripOption[] = [];
        const seenRoutes = new Set<string>();

        for (const opt of transferOptions) {
            if (opt.segments.length !== 2) continue;
            const seg1 = opt.segments[0];
            const seg2 = opt.segments[1];

            // Only shortcut when the first bus leg is trivially short
            if (seg1.estimatedTime > 5) continue;

            // Skip if this route is already in direct options or already shortcut
            if (directRouteNums.has(seg2.routeNum) || seenRoutes.has(seg2.routeNum)) continue;

            // Check if the user can walk directly to the seg2 boarding stop
            const walkToBoard = this.calculateDistance(
                origin,
                { lat: seg2.fromStopLat, lng: seg2.fromStopLng }
            );
            if (walkToBoard > this.WALKING_DISTANCE_EXPANDED) continue; // too far

            const walkFromAlight = this.calculateDistance(
                { lat: seg2.toStopLat, lng: seg2.toStopLng },
                destination
            );

            const walkTime = ((walkToBoard + walkFromAlight) / 1000) / this.WALKING_SPEED * 60 * this.walkMultiplier;

            seenRoutes.add(seg2.routeNum);
            shortcuts.push({
                segments: [seg2],
                totalTime: Math.round(seg2.estimatedTime + walkTime),
                transfers: 0,
                walkToFirstStop: Math.round(walkToBoard),
                walkingDistance: Math.round(walkToBoard + walkFromAlight),
                originStop: seg2.fromStop,
                destinationStop: seg2.toStop,
                originLat: origin.lat,
                originLng: origin.lng,
                destLat: destination.lat,
                destLng: destination.lng,
                isLivePrediction: false
            });
        }

        return shortcuts;
    }

    /**
     * Find stops within walking distance of a location.
     */
    private findNearbyStops(location: Coordinates, maxDistance: number): NearbyStop[] {
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
            .slice(0, 15); // Top 15 closest — ensures both directional stops (NB+SB, EB+WB) are always included

        return nearbyStops;
    }

    /**
     * Calculate distance between two locations using Haversine formula.
     * Returns distance in meters.
     */
    private calculateDistance(loc1: Coordinates, loc2: Coordinates): number {
        const earthRadius = 6173e3;

        // converting coordinates to radians 
        const radLat1 = loc1.lat * Math.PI / 180;
        const radLat2 = loc2.lat * Math.PI / 180;

        // computing difference between latitude and longitude
        const differenceLat = (loc2.lat - loc1.lat) * Math.PI / 180;
        const differenceLon = (loc2.lng - loc1.lng) * Math.PI / 180;

        // finding 
        const a = Math.sin(differenceLat / 2) * Math.sin(differenceLat / 2) +
            (Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(differenceLon / 2) * Math.sin(differenceLon / 2));

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return earthRadius * c;
    }

    /**
     * Enrich trip options with real-time predicted arrival times.
     * Fetches actual predictions from the transit API for each boarding stop,
     * then matches predictions to route segments for accurate ETAs.
     */
    private async enrichWithLiveETAs(options: TripOption[]): Promise<void> {
        // Collect unique boarding stop IDs from ALL segments (not just the first)
        const stopIds = new Set<string>();
        for (const option of options) {
            for (const seg of option.segments) {
                if (seg.fromStopId) stopIds.add(seg.fromStopId);
            }
        }

        if (stopIds.size === 0) return;

        // Fetch predictions for all boarding stops in parallel
        const predictionsMap = new Map<string, StopPrediction[]>();
        const baseUrl = typeof window !== 'undefined'
            ? (import.meta as any).env?.VITE_SERVER_URL || ''
            : '';

        const fetchPromises = Array.from(stopIds).map(async (stopId) => {
            try {
                const response = await fetch(`${baseUrl}/api/stop-predictions/${stopId}`);
                if (response.ok) {
                    const preds: StopPrediction[] = await response.json();
                    predictionsMap.set(stopId, preds);
                    console.log(`[RoutePlanningService] Got ${preds.length} predictions for stop ${stopId}`);
                }
            } catch (err) {
                console.error(`[RoutePlanningService] Failed to fetch predictions for stop ${stopId}:`, err);
            }
        });

        await Promise.all(fetchPromises);

        // Now enrich each option with the real predictions
        const now = new Date();

        for (const option of options) {
            const now2 = new Date();
            let firstSegmentLive = false;

            for (let segIdx = 0; segIdx < option.segments.length; segIdx++) {
                const seg = option.segments[segIdx];
                const stopId = seg.fromStopId;
                const routeNum = seg.routeNum;

                const predictions = predictionsMap.get(stopId) || [];

                // Find predictions matching this route
                const routePreds = predictions.filter(p => String(p.route_id) === routeNum);

                if (routePreds.length === 0) {
                    continue;
                }

                // Find the soonest prediction (first one that's in the future)
                let bestPred: StopPrediction | null = null;
                let bestWaitMinutes: number | null = null;

                for (const pred of routePreds) {
                    const predDate = this.parsePredTime(pred.pred_time, now2);
                    if (!predDate) continue;

                    const waitMs = predDate.getTime() - now2.getTime();
                    const waitMinutes = waitMs / 60000;

                    // Only consider future arrivals (or just arriving, up to -2 min)
                    if (waitMinutes < -2) continue;

                    if (bestWaitMinutes === null || waitMinutes < bestWaitMinutes) {
                        bestWaitMinutes = waitMinutes;
                        bestPred = pred;
                    }
                }

                if (bestPred && bestWaitMinutes !== null) {
                    const waitRounded = Math.max(0, Math.round(bestWaitMinutes));
                    seg.nextBusETA = waitRounded;
                    seg.predTime = bestPred.pred_time.trim();
                    seg.busId = bestPred.bus_id ?? undefined;

                    // Only set top-level wait time from the FIRST segment
                    if (segIdx === 0) {
                        option.waitTime = waitRounded;
                        option.totalTimeWithWait = option.totalTime + waitRounded;
                        firstSegmentLive = true;
                    }

                    console.log(`[RoutePlanningService] Route ${routeNum} at stop ${stopId}: ` +
                        `Bus #${bestPred.bus_id} predicted at ${bestPred.pred_time.trim()}, ` +
                        `wait ~${waitRounded} min`);
                }
            }

            // Mark as live if at least the first segment has real-time data —
            // for transfer routes, the second segment's stop often has no predictions
            // yet (user hasn't arrived there), but the first bus info is still actionable
            option.isLivePrediction = firstSegmentLive;

            // Compute estimated arrival at destination from first bus prediction + total trip time
            const firstSeg = option.segments[0];
            if (firstSeg?.predTime) {
                const firstBusArrival = this.parsePredTime(firstSeg.predTime, now2);
                if (firstBusArrival) {
                    const arrivalDate = new Date(firstBusArrival.getTime() + option.totalTime * 60000);
                    const hours = arrivalDate.getHours();
                    const minutes = arrivalDate.getMinutes();
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    const displayHours = hours % 12 || 12;
                    const displayMinutes = minutes.toString().padStart(2, '0');
                    option.estimatedArrival = `${displayHours}:${displayMinutes} ${ampm}`;
                }
            }
        }
    }

    /**
     * Parse a prediction time string into a Date object for today.
     * Handles both formats:
     *   - "01:18 PM" (old 12-hour with AM/PM)
     *   - "01:18:00" (new 12-hour without AM/PM, wraps 12→01 after noon)
     */
    private parsePredTime(predTime: string, now: Date): Date | null {
        try {
            const trimmed = predTime.trim();

            // Try old format first: "01:18 PM"
            const ampmMatch = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (ampmMatch) {
                let hours = parseInt(ampmMatch[1], 10);
                const minutes = parseInt(ampmMatch[2], 10);
                const ampm = ampmMatch[3].toUpperCase();

                if (ampm === 'PM' && hours !== 12) hours += 12;
                if (ampm === 'AM' && hours === 12) hours = 0;

                const result = new Date(now);
                result.setHours(hours, minutes, 0, 0);
                return result;
            }

            // New format: "09:08:36" or "01:18:00" (12-hour without AM/PM)
            const parts = trimmed.split(':');
            if (parts.length >= 2) {
                let hours = parseInt(parts[0], 10);
                const minutes = parseInt(parts[1], 10);

                const result = new Date(now);
                result.setHours(hours, minutes, 0, 0);

                // If time is more than 6 hours in the past, it's PM (e.g. "01:07" = 1:07 PM)
                if (result.getTime() < now.getTime() - 6 * 60 * 60_000 && hours < 12) {
                    result.setHours(hours + 12, minutes, 0, 0);
                }

                return result;
            }

            return null;
        } catch {
            return null;
        }
    }
}
