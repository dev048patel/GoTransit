/*
This is Frontend Part, which controls behaviour of the map.
1. Fetch Configuration from Model
2. Initialize State / External APIs (Business Logic)
3. Return prepared data for the View
*/
import { useLoadScript } from '@react-google-maps/api';
import { MapModel, Coordinates, MapOptions } from '../models/MapModel';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Stop } from '../models/transit/Stop';
import transitRoutes from '../models/data/transitRoutes';
import transitColors from '../models/data/transitColors';
import { Route } from '../models/transit/Route';
import { BusPosition } from '../models/transit/BusPosition';
import { getStopsForRoute } from '../models/services/StopToRouteIndex';
import { MapControllerOutput } from '../models/controllers/MapControllerOutput';
import { DetourService } from '../models/services/DetourService';
import { ActiveDetour } from '../models/transit/Detour';
import { RoutePolylineService } from '../models/services/RoutePolylineService';
import type { WeatherSnapshot } from '../models/services/WeatherService';

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
  const [apiRoutes, setApiRoutes] = useState<Route[]>(transitRoutes); // start with static data, API overrides
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [activeDetours, setActiveDetours] = useState<ActiveDetour[]>([]);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);

  // Fetch weather from backend every 5 minutes — backend caches EC DataMart for us
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    const fetch5min = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/weather/current`);
        if (res.ok) setWeather(await res.json());
      } catch { /* non-critical — UI degrades gracefully if weather unavailable */ }
    };
    fetch5min();
    const interval = setInterval(fetch5min, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Show detours only for the currently selected route — keeps the map clean.
  // Cleared when the user deselects (no route → no detours displayed).
  useEffect(() => {
    if (!selectedRoute) {
      setActiveDetours([]);
      return;
    }
    let cancelled = false;
    DetourService.getActiveDetours(selectedRoute).then(detours => {
      if (!cancelled) setActiveDetours(detours);
    });
    return () => { cancelled = true; };
  }, [selectedRoute]);

  // Track user's live GPS location
  useEffect(() => {
    if (!navigator.geolocation) return;
    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn('Geolocation error:', err.message)
    );
    // Watch for position changes
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn('Geolocation watch error:', err.message),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

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

  // Fetch Routes from Backend API → so admin hide/rename changes are reflected
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const baseUrl = import.meta.env.VITE_SERVER_URL;
        const response = await fetch(`${baseUrl}/api/routes`);
        if (!response.ok) throw new Error('Failed to fetch routes');
        const data: Route[] = await response.json();
        setApiRoutes(data);
      } catch (error) {
        console.error('Error fetching routes:', error);
      }
    };

    fetchRoutes();
  }, []);

  /*
    Bus cache: prevents losing buses that temporarily vanish from the API.
    Each bus is tracked with a missCount; only evicted after MAX_MISS consecutive
    absences (~4.5s at the 1.5s poll interval).
  */
  // new Map -> initialize cache as an empty map
  const busCacheRef = useRef<Map<number, { bus: BusPosition; missCount: number }>>(new Map()); // useRef to store the value of bus and re-render the map when the value changes 
  const MAX_MISS = 3; // Remove a bus only after it's been missing for 3 consecutive polls

  // Poll for Live Buses → API Call (with cache merge)
  useEffect(() => {
    const fetchLiveBuses = async () => {
      try {
        const baseUrl = import.meta.env.VITE_SERVER_URL;
        const fetchUrl = `${baseUrl}/api/live?_=${Date.now()}`;

        // Use timestamp to prevent browser caching
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const data: BusPosition[] = await response.json(); // For storing values of buses
          const cache = busCacheRef.current; // For storing values of buses

          // Track which bus_ids came in this response
          const freshIds = new Set<number>();

          // Adding buses to cache
          for (const bus of data) {
            freshIds.add(bus.bus_id);
            cache.set(bus.bus_id, { bus, missCount: 0 });
          }

          // Increment missCount for buses NOT in the response; evict stale ones
          for (const [id, entry] of cache) {
            if (!freshIds.has(id)) {
              entry.missCount++;
              if (entry.missCount > MAX_MISS) {
                cache.delete(id); // Bus has been missing too long — remove it
              }
            }
          }

          // Update React state from the cache
          setLiveBuses(Array.from(cache.values()).map(e => e.bus));
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
      import('../models/data/transitShapes.json').then((module) => {
        setShapesData(module.default);
      });
    }
  }, [selectedRoute, shapesData]);

  // Take all routes from API → Look up their color in array → Merge the color into each route
  const routesWithColors = useMemo(() => {
    return apiRoutes.map(route => {
      const colorData = transitColors.find(c => c.route_id === parseInt(route.ROUTE_NUM));
      return {
        ...route,
        ROUTE_COLO: colorData ? colorData.colour.replace('#', '') : route.ROUTE_COLO
      };
    });
  }, [apiRoutes]);

  // Show stops only when zoomed in enough (avoids marker lag at low zoom)
  // Route-selected stops also require zoom >= 14 to avoid clutter at city-wide view
  const visibleStops = useMemo(() => {
    if (selectedRoute && currentZoom >= 14) {
      const routeStopIds = getStopsForRoute(selectedRoute);
      return allStops.filter(stop => routeStopIds.has(stop.STOP_ID));
    }
    if (currentZoom >= 17) return allStops;
    return [];
  }, [allStops, selectedRoute, currentZoom]);

  // Source: src/newData/polyline_data/route_{N}_polyline.json (LineString [lat, lng])
  // Replaces the older transitShapes.json GeoJSON for displayed route polylines.
  const routePaths = useMemo(() => {
    if (!selectedRoute) return [];
    return RoutePolylineService.getRoutePaths(selectedRoute);
  }, [selectedRoute]);

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
    userLocation,
    activeDetours,
    weather,
  };
};
