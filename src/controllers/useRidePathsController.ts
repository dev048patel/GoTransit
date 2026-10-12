/*
 Road path for each bus ride of a trip. First choice is the route's polyline, cut to the carriageway
 the bus actually drives; where that loop doesn't follow the route, the GTFS direction shapes. An
 entry is null when neither covers the ride; the view then falls back to its own shape-based drawing.
*/
import { useMemo } from 'react';
import { TripOption } from '../models/transit/RoutePlanning';
import { RoutePolylineService } from '../models/services/RoutePolylineService';
import { getGtfsRidePath } from '../models/services/StopToRouteIndex';

export function useRidePathsController(tripOption: TripOption): ({ lat: number; lng: number }[] | null)[] {
    return useMemo(
        () => tripOption.segments.map(seg =>
            RoutePolylineService.getRidePath(seg.routeNum, seg.fromStopId, seg.toStopId)
            ?? getGtfsRidePath(seg.routeNum, seg.fromStopId, seg.toStopId)
        ),
        [tripOption]
    );
}
