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
import { getStopsForRoute } from '../services/StopToRouteIndex';

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
  // 1. Fetch Configuration from Model and initialize state variables
  const { libraries } = MapModel; // Destructuring way of writing const libraries = MapModel.libraries

  // 2. Initialize State / External APIs (Business Logic)
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // using useState so it remembers the value even after re-renders so it has 2 values : current value and a function to update it
  const [allStops, setAllStops] = useState<Stop[]>([]); // here storing all stops in form of array : [allStops, setAllStops] : [current value, function to update it]
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null); // It will store the selected route number from RouteManager -> Navbar and will return null if no route is selected
  const [liveBuses, setLiveBuses] = useState<BusPosition[]>([]); // Store live bus positions 
  const [center, setCenter] = useState<Coordinates>(MapModel.center);
  const [zoom, setZoom] = useState<number>(MapModel.defaultZoom);
  const [selectedPlaceMarker, setSelectedPlaceMarker] = useState<{ location: Coordinates; name: string } | null>(null);
  const [currentZoom, setCurrentZoom] = useState(MapModel.defaultZoom);
  const [shapesData, setShapesData] = useState<any>(null);

  // Callback for MapView to report zoom changes
  const onZoomChanged = useCallback((newZoom: number) => {
    setCurrentZoom(newZoom);
  }, []);

  // Fetch Stops from Backend API -> API Call
  useEffect(() => {
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

  // Poll for Live Buses -> API Call
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

    fetchLiveBuses(); // First we are showing bus at the moment and then we will fetch it again after 1.5 seconds so map does not show without bus at the begning.
    const interval = setInterval(fetchLiveBuses, 1500); // Poll every 1.5 seconds for real-time feel

    return () => clearInterval(interval); // Clearing interval to prevent memory leaks meaning it will not run again and again
  }, []);

  /*
    Lazy-load the 3.4MB transitShapes.json file which includes:
    Lat, Long, Properties(Route_NUM, ROUTE_NAME, ROUTE_ID, SHAPE_ID) 
  */
  useEffect(() => {
    if (selectedRoute && !shapesData) {
      import('../data/transitShapes.json').then((module) => {
        setShapesData(module.default);
      });
    } 
  }, [selectedRoute, shapesData]);

  // Take all TransitRoute -> Look up their color in array -> Marge the color into each route -> Caches the results using useMemo()
  const routesWithColors = useMemo(() => {
    // Searching for color & parseInt will convert the route.Route_NUM in string to int
    return transitRoutes.map(route => {
      const colorData = transitColors.find(c => c.route_id === parseInt(route.ROUTE_NUM));
      return {
        ...route, // Spreader operator -> It copies all existing properties of route and overrides it below
        // Cleaning color repersentation by removing # 
        ROUTE_COLO: colorData ? colorData.colour.replace('#', '') : route.ROUTE_COLO
      };
    });
  }, []);

  // Show stops only for the selected route (solves 1,440 stop lag)
  const visibleStops = useMemo(() => {
    if (!selectedRoute) return []; // No route selected -> no stops
    const routeStopIds = getStopsForRoute(selectedRoute);
    return allStops.filter(stop => routeStopIds.has(stop.STOP_ID));
  }, [allStops, selectedRoute]);

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
    liveBuses: selectedRoute
      ? liveBuses.filter(b => String(b.route_num) === selectedRoute)
      : liveBuses,
    handlePlaceSelect,
    selectedPlaceMarker,
    setSelectedPlaceMarker,
    currentZoom,
    onZoomChanged,
  };
};
