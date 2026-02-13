/*
This is Frontend Part, which controls behaviour of the map.
1. Fetch Configuration from Model
2. Initialize State / External APIs (Business Logic)
3. Return prepared data for the View
*/
import { useLoadScript } from '@react-google-maps/api';
import { MapModel, Coordinates, MapOptions } from '../models/MapModel';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Stop } from '../models/Stop';
import transitRoutes from '../data/transitRoutes';
import transitColors from '../data/transitColors';
import { Route } from '../models/Route';
import { BusPosition } from '../models/BusPosition';

interface MapControllerOutput {
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

export const useMapController = (): MapControllerOutput => {
  // 1. Fetch Configuration from Model
  const { libraries } = MapModel;

  // 2. Initialize State / External APIs (Business Logic)
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [liveBuses, setLiveBuses] = useState<BusPosition[]>([]);
  const [center, setCenter] = useState<Coordinates>(MapModel.center);
  const [zoom, setZoom] = useState<number>(MapModel.defaultZoom);
  const [selectedPlaceMarker, setSelectedPlaceMarker] = useState<{ location: Coordinates; name: string } | null>(null);
  const [currentZoom, setCurrentZoom] = useState(MapModel.defaultZoom);
  const [shapesData, setShapesData] = useState<any>(null);

  // Callback for MapView to report zoom changes
  const onZoomChanged = useCallback((newZoom: number) => {
    setCurrentZoom(newZoom);
  }, []);

  useEffect(() => {
    // Fetch Stops from Backend API
    const fetchStops = async () => {
      try {
        const baseUrl = import.meta.env.VITE_SERVER_URL;
        const response = await fetch(`${baseUrl}/api/stops`);
        if (!response.ok) throw new Error('Failed to fetch stops');
        const data: Stop[] = await response.json();
        setAllStops(data);
      } catch (error) {
        console.error("Error fetching stops:", error);
      }
    };

    fetchStops();
  }, []);

  // Poll for Live Buses
  useEffect(() => {
    const fetchLiveBuses = async () => {
      try {
        const baseUrl = import.meta.env.VITE_SERVER_URL;
        const fetchUrl = `${baseUrl}/api/live?_=${Date.now()}`;

        // Use timestamp to prevent caching 
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const data: BusPosition[] = await response.json();
          setLiveBuses(data);
        }
      } catch (error) {
        console.error("Error fetching live buses", error);
      }
    };

    fetchLiveBuses();
    const interval = setInterval(fetchLiveBuses, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Lazy-load the 3.4MB shapes file only when needed
  useEffect(() => {
    if (selectedRoute && !shapesData) {
      import('../data/transitShapes.json').then((module) => {
        setShapesData(module.default);
      });
    }
  }, [selectedRoute, shapesData]);

  const routesWithColors = useMemo(() => {
    return transitRoutes.map(route => {
      const colorData = transitColors.find(c => c.route_id === parseInt(route.ROUTE_NUM));
      return {
        ...route,
        ROUTE_COLO: colorData ? colorData.colour.replace('#', '') : route.ROUTE_COLO
      };
    });
  }, []);

  // Only show stops when zoomed in enough (≥14) to avoid rendering 1,400 DOM markers
  const visibleStops = useMemo(() => {
    if (currentZoom < 14) return [];
    return allStops;
  }, [allStops, currentZoom]);

  const routePaths = useMemo(() => {
    if (!selectedRoute || !shapesData) return [];

    const feature = shapesData.features?.find((f: any) =>
      f.properties?.ROUTE_NUM === selectedRoute ||
      f.properties?.RouteId === selectedRoute ||
      f.properties?.ROUTE_ID === selectedRoute
    );

    if (!feature || !feature.geometry?.coordinates) return [];

    // Return coordinates of Selected Route as Lat and Lng
    return feature.geometry.coordinates.map((line: number[][]) =>
      line.map((coord: number[]) => ({
        lat: coord[1],
        lng: coord[0]
      }))
    );
  }, [selectedRoute, shapesData]);

  // Handle place selection from autocomplete
  const handlePlaceSelect = (place: any) => {  // for updating the map center
    if (place.location) {
      setCenter(place.location);
      setZoom(15); // Zoom in when a place is selected
      setSelectedPlaceMarker({ // set selected place marker
        location: place.location,
        name: place.displayName || 'Selected Place'
      });
    }
  };

  // 3. Return prepared data for the View
  return {
    isLoaded,
    loadError,
    center,
    setCenter,
    options: MapModel.options,
    containerStyle: MapModel.containerStyle,
    zoom,
    setZoom,
    stops: visibleStops,
    routes: routesWithColors,
    selectedRoute,
    setSelectedRoute,
    routePaths,
    liveBuses,
    handlePlaceSelect,
    selectedPlaceMarker,
    setSelectedPlaceMarker,
    currentZoom,
    onZoomChanged,
  };
};
