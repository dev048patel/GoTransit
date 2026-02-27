import React from 'react';
import { Coordinates, MapOptions } from '../MapModel';
import { Stop } from '../transit/Stop';
import { Route } from '../transit/Route';
import { BusPosition } from '../transit/BusPosition';

export interface MapControllerOutput {
    isLoaded: boolean;
    loadError: Error | undefined;
    center: Coordinates;
    setCenter: (c: Coordinates) => void;
    options: MapOptions;
    containerStyle: React.CSSProperties;
    zoom: number;
    setZoom: (z: number) => void;
    stops: Stop[];
    routes: Route[];
    selectedRoute: string | null;
    setSelectedRoute: (routeNum: string | null) => void;
    routePaths: { lat: number; lng: number }[][];
    liveBuses: BusPosition[];
    handlePlaceSelect: (place: any) => void;
    selectedPlaceMarker: { location: Coordinates; name: string } | null;
    setSelectedPlaceMarker: (marker: { location: Coordinates; name: string } | null) => void;
    currentZoom: number;
    onZoomChanged: (newZoom: number) => void;
}
