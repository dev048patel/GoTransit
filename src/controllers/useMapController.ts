/*
This is Frontend Part, which controls behaviour of the map.
1. Fetch Configuration from Model
2. Initialize State / External APIs (Business Logic)
3. Return prepared data for the View
*/
import { useLoadScript } from '@react-google-maps/api';
import { MapModel, Coordinates, MapOptions } from '../models/MapModel';
import React, { useState, useEffect, useMemo } from 'react';
import { Stop } from '../models/Stop';
import transitRoutes from '../data/transitRoutes';
import transitColors from '../data/transitColors';
import transitShapesData from '../data/transitShapes.json';
import { Route } from '../models/Route';
import { BusPosition } from '../models/BusPosition';

interface MapControllerOutput {
  isLoaded: boolean;
  loadError: Error | undefined;
  center: Coordinates;
  options: MapOptions;
  containerStyle: React.CSSProperties;
  zoom: number;
  stops: Stop[];
  routes: Route[];
  selectedRoute: string | null;
  setSelectedRoute: (routeNum: string | null) => void;
  routePaths: { lat: number; lng: number }[][];
  liveBuses: BusPosition[];
}

export const useMapController = (): MapControllerOutput => {
  // 1. Fetch Configuration from Model
  const { libraries } = MapModel;

  // 2. Initialize State / External APIs (Business Logic)
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [liveBuses, setLiveBuses] = useState<BusPosition[]>([]);

  useEffect(() => {
    // Fetch Stops from Backend API
    const fetchStops = async () => {
      try {
        const baseUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
        const response = await fetch(`${baseUrl}/api/stops`);
        if (!response.ok) throw new Error('Failed to fetch stops');
        const data: Stop[] = await response.json();
        setStops(data);
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
        const baseUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
        const fetchUrl = `${baseUrl}/api/live?_=${Date.now()}`;
        console.log(`[useMapController] Fetching Live Buses from:`, fetchUrl);

        // Use timestamp to prevent caching as requested
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
    const interval = setInterval(fetchLiveBuses, 1500); // Poll every 1.5 seconds

    return () => clearInterval(interval);
  }, []);

  const routesWithColors = useMemo(() => {
    return transitRoutes.map(route => {
      const colorData = transitColors.find(c => c.route_id === parseInt(route.ROUTE_NUM));
      return {
        ...route,
        ROUTE_COLO: colorData ? colorData.colour.replace('#', '') : route.ROUTE_COLO
      };
    });
  }, []);

  const routePaths = useMemo(() => {
    if (!selectedRoute) return [];

    const feature = (transitShapesData as any).features?.find((f: any) =>
      f.properties?.ROUTE_NUM === selectedRoute ||
      f.properties?.RouteId === selectedRoute ||
      f.properties?.ROUTE_ID === selectedRoute
    );

    if (!feature || !feature.geometry?.coordinates) return [];

    return feature.geometry.coordinates.map((line: number[][]) =>
      line.map((coord: number[]) => ({
        lat: coord[1],
        lng: coord[0]
      }))
    );
  }, [selectedRoute]);

  // 3. Return prepared data for the View
  return {
    isLoaded,
    loadError,
    center: MapModel.center,
    options: MapModel.options,
    containerStyle: MapModel.containerStyle,
    zoom: MapModel.defaultZoom,
    stops,
    routes: routesWithColors,
    selectedRoute,
    setSelectedRoute,
    routePaths,
    liveBuses,
  };
};
