/**
 Only responsible for UX/UI rendering. 
 It receives all data as props and determines how the map looks on screen. It contains NO business logic.
 */
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { Coordinates } from '../models/MapModel';
import { TripOption } from '../models/transit/RoutePlanning';
import { BusPosition } from '../models/transit/BusPosition';
import { Stop } from '../models/transit/Stop';
import { StopDirection, STOP_DIRECTION_ARROW, STOP_DIRECTION_HEADING, STOP_DIRECTION_LABEL, directionOfStop } from '../models/transit/StopDirection';
import { MapViewProps } from '../models/views/MapViewProps';
import transitColors from '../models/data/transitColors';
import StopDetailPanel from './components/transit/StopDetailPanel';
import Navbar from './Navbar';
import TripPlannerModal from './components/transit/TripPlannerModal';
import BusSuggestionPanel from './components/transit/BusSuggestionPanel';
import RouteTrackingOverlay from './components/transit/RouteTrackingOverlay';
import TrackingPanel from './components/transit/TrackingPanel';
import UserLocationMarker from './components/transit/UserLocationMarker';
import LiveBusMarker from './components/transit/LiveBusMarker';
import { useMarkerCharacter } from '../controllers/useMarkerCharacter';
import { stopIconFor } from '../models/data/stopIcons';
import { applyCharacterTheme } from '../models/data/characterThemes';
import PlaceBubble, { destinationPinFor } from './components/transit/PlaceBubble';

/*
 -> <MapView isLoaded={...} center={...} />
 */
export const MapView: React.FC<MapViewProps> = ({
  isLoaded,
  loadError,
  center,
  setCenter,
  options,
  containerStyle,
  zoom,
  setZoom,
  stops,
  routes,
  selectedRoute,
  setSelectedRoute,
  routePaths,
  liveBuses,
  handlePlaceSelect,
  handleMapPlacePick,
  selectedPlaceMarker,
  setSelectedPlaceMarker,
  currentZoom,
  onZoomChanged,
  activeDetours,
  weather,
}) => {
  const [showTripPlanner, setShowTripPlanner] = useState(false);
  const [showInfoWindow, setShowInfoWindow] = useState(false);
  const [showBusSuggestions, setShowBusSuggestions] = useState(false);
  const [activeTracking, setActiveTracking] = useState<TripOption | null>(null);
  const [selectedBus, setSelectedBus] = useState<BusPosition | null>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [showStopDetail, setShowStopDetail] = useState(false);

  // Bus stops are drawn to match the user's chosen map character
  const { character } = useMarkerCharacter();
  const stopIcon = stopIconFor(character);
  const placePin = destinationPinFor(character);

  // Theme the map screens to the chosen character; other pages keep the original colours
  useEffect(() => {
    applyCharacterTheme(character);
    return () => applyCharacterTheme('default');
  }, [character]);

  // Handle stop marker click — open the departure board panel
  const handleStopClick = (stop: Stop) => {
    setSelectedStop(stop);
    setShowStopDetail(true);
    setShowBusSuggestions(false);
    setShowInfoWindow(false);
  };

  // Get route color from transitColors data
  const getRouteColor = (routeNum: string): string => {
    const match = transitColors.find(c => c.route_id === parseInt(routeNum));
    return match ? match.colour : '#1a73e8';
  };

  // When a place is selected, also show the place bubble
  const handlePlaceSelectWithPopup = (place: any) => {
    handlePlaceSelect(place);
    setShowInfoWindow(true);
    setShowBusSuggestions(false);
    setShowStopDetail(false);
  };

  // Tapping the map: a named place (shop, park, school…) or any bare spot becomes the destination,
  // with the same character bubble a search result gets
  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (activeTracking || !e.latLng) return;
    const placeId = (e as google.maps.IconMouseEvent).placeId;
    // Swap Google's own place popup for the character bubble
    if (placeId) e.stop();
    // A tap on empty map while the bubble is open just dismisses it
    else if (showInfoWindow) { setShowInfoWindow(false); return; }

    const picked = await handleMapPlacePick({ lat: e.latLng.lat(), lng: e.latLng.lng() }, placeId || undefined);
    if (!picked) return;
    setShowInfoWindow(true);
    setShowBusSuggestions(false);
    setShowStopDetail(false);
  };

  // Search box cleared: drop the flag, bubble and suggestions for that place
  const handleClearPlace = useCallback(() => {
    setSelectedPlaceMarker(null);
    setShowInfoWindow(false);
    setShowBusSuggestions(false);
  }, [setSelectedPlaceMarker]);

  // When a route card is clicked, start tracking and recenter to user GPS
  const handleSelectRoute = (option: TripOption) => {
    setActiveTracking(option);
    setShowBusSuggestions(false);
    setShowTripPlanner(false);
    setSelectedRoute(null);
    // Recenter map to user's origin location
    setCenter({ lat: option.originLat, lng: option.originLng });
    setZoom(14);
  };

  const handleStopTracking = () => {
    setActiveTracking(null);
    setSelectedRoute(null);
    setSelectedPlaceMarker(null); // Remove the destination marker from map
  };

  // Go back to suggestions without clearing the destination
  const handleBackToSuggestions = () => {
    setActiveTracking(null);
    setShowBusSuggestions(true);
  };

  // Use a ref to track the map instance for zoom change events
  const mapRef = useRef<google.maps.Map | null>(null);

  // Track visible map bounds for viewport culling (only render on-screen stops)
  const [mapBounds, setMapBounds] = useState<{ n: number; s: number; e: number; w: number } | null>(null);

  const updateBounds = useCallback(() => {
    if (mapRef.current) {
      const b = mapRef.current.getBounds();
      if (b) {
        const ne = b.getNorthEast();
        const sw = b.getSouthWest();
        setMapBounds({ n: ne.lat(), s: sw.lat(), e: ne.lng(), w: sw.lng() });
      }
    }
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleZoomChanged = useCallback(() => {
    if (mapRef.current) {
      onZoomChanged(mapRef.current.getZoom() || 11);
    }
  }, [onZoomChanged]);

  // Filter stops to only those within the visible viewport
  const viewportStops = useMemo(() => {
    if (!mapBounds || stops.length === 0) return stops;
    return stops.filter(stop => {
      const lat = parseFloat(stop.LAT);
      const lng = parseFloat(stop.LON);
      return lat >= mapBounds.s && lat <= mapBounds.n && lng >= mapBounds.w && lng <= mapBounds.e;
    });
  }, [stops, mapBounds]);
  if (loadError) return <div>Error Loading maps</div>;
  if (!isLoaded) return <div>Loading Maps...</div>;

  const currentRoute = routes.find(r => r.ROUTE_NUM === selectedRoute);
  const routeColor = currentRoute?.ROUTE_COLO ? `#${currentRoute.ROUTE_COLO}` : '#FF0000';

  return (
    <div className="relative h-screen w-full">
      {/* Hide Navbar when tracking is active for clean view */}
      {!activeTracking && (
        <Navbar
          onPlaceSelect={handlePlaceSelectWithPopup}
          onClearPlace={handleClearPlace}
          routes={routes}
          selectedRoute={selectedRoute}
          onRouteSelect={setSelectedRoute}
        />
      )}

      <TripPlannerModal
        isOpen={showTripPlanner}
        onClose={() => setShowTripPlanner(false)}
        onSelectRoute={handleSelectRoute}
        liveBuses={liveBuses}
        weather={weather}
      />

      {/* Bus Suggestion Panel (shown after the user confirms in the place bubble) */}
      {showBusSuggestions && selectedPlaceMarker && !activeTracking && (
        <BusSuggestionPanel
          destination={{
            lat: selectedPlaceMarker.location.lat,
            lng: selectedPlaceMarker.location.lng,
            name: selectedPlaceMarker.name
          }}
          onClose={() => setShowBusSuggestions(false)}
          onSelectRoute={handleSelectRoute}
          liveBuses={liveBuses}
          weather={weather}
          character={character}
        />
      )}

      {/* Stop Detail Panel (departure board for a selected stop) */}
      {showStopDetail && selectedStop && !activeTracking && (
        <StopDetailPanel
          stop={selectedStop}
          onClose={() => {
            setShowStopDetail(false);
            setSelectedStop(null);
          }}
        />
      )}

      {/* Tracking Panel (bottom sheet) */}
      {activeTracking && (
        <TrackingPanel tripOption={activeTracking} onStopTracking={handleStopTracking} onBack={handleBackToSuggestions} />
      )}


      {/* GoogleMap Component */}
      <GoogleMap
        key={`map-${center.lat}-${center.lng}-${activeTracking ? 'tracking' : 'idle'}`}
        mapContainerStyle={containerStyle}
        zoom={zoom}
        center={center}
        options={options}
        onLoad={onMapLoad}
        onZoomChanged={handleZoomChanged}
        onIdle={updateBounds}
        onClick={handleMapClick}
      >
        {/* Route Tracking Overlay (when tracking is active) */}
        {activeTracking && (
          <RouteTrackingOverlay tripOption={activeTracking} />
        )}

        {/* Render Stops — viewport-culled, hidden during tracking */}
        {!activeTracking && viewportStops.map((stop) => (
          <Marker
            key={stop.STOP_ID}
            position={{
              lat: parseFloat(stop.LAT),
              lng: parseFloat(stop.LON),
            }}
            title={`${stop.STOP_NAME} (#${stop.STOP_ID})`}
            icon={{
              url: stopIcon.url,
              scaledSize: isLoaded ? new google.maps.Size(stopIcon.width, stopIcon.height) : undefined,
              anchor: isLoaded ? new google.maps.Point(stopIcon.anchorX, stopIcon.anchorY) : undefined,
            }}
            onClick={() => handleStopClick(stop)}
          />
        ))}

        {/* Render Route Polylines (hide during tracking) */}
        {!activeTracking && routePaths.map((path, index) => (
          <Polyline
            key={index}
            path={path}
            options={{
              strokeColor: routeColor,
              strokeOpacity: 0.8,
              strokeWeight: 5,
            }}
          />
        ))}

        {/* Render Active Detour Polylines (red, drawn on top of regular route) */}
        {!activeTracking && activeDetours.map((detour) => (
          <Polyline
            key={`detour-${detour.detourId}`}
            path={detour.path}
            options={{
              strokeColor: detour.color,
              strokeOpacity: detour.opacity,
              strokeWeight: 5,
              zIndex: 100,
            }}
          />
        ))}

        {/* Selected place: themed flag pin + the character's speech bubble */}
        {selectedPlaceMarker && !activeTracking && (
          <Marker
            position={selectedPlaceMarker.location}
            title={selectedPlaceMarker.name}
            zIndex={200}
            icon={{
              url: placePin.url,
              scaledSize: isLoaded ? new google.maps.Size(placePin.width, placePin.height) : undefined,
              anchor: isLoaded ? new google.maps.Point(placePin.anchorX, placePin.anchorY) : undefined,
            }}
            onClick={() => setShowInfoWindow(true)}
          />
        )}
        {selectedPlaceMarker && !activeTracking && showInfoWindow && (
          <PlaceBubble
            character={character}
            position={selectedPlaceMarker.location}
            name={selectedPlaceMarker.name}
            onConfirm={() => { setShowInfoWindow(false); setShowBusSuggestions(true); }}
            onClose={() => { setShowInfoWindow(false); setSelectedPlaceMarker(null); }}
          />
        )}

        {/* User's live GPS location — chosen character marker */}
        <UserLocationMarker />

        {/* Live buses in their route colours, gliding between position reports */}
        {(activeTracking
          ? liveBuses.filter(bus => {
            const trackingRoutes = new Set(activeTracking.segments.map(s => s.routeNum));
            return trackingRoutes.has(String(bus.route_num));
          })
          : liveBuses
        ).map((bus) => {
          const matchedRoute = routes.find(r => r.ROUTE_NUM === String(bus.route_num));
          return (
            <LiveBusMarker
              key={bus.bus_id}
              bus={bus}
              color={matchedRoute?.ROUTE_COLO ? `#${matchedRoute.ROUTE_COLO}` : '#1a73e8'}
              selected={selectedBus?.bus_id === bus.bus_id}
              onSelect={() => {
                setSelectedBus(bus);
                setSelectedRoute(String(bus.route_num));
              }}
              onClose={() => setSelectedBus(null)}
            />
          );
        })}
      </GoogleMap>
    </div>
  );
};
