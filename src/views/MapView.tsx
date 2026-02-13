/**
 Only responsible for UX/UI rendering. 
 It receives all data as props and determines how the map looks on screen. It contains NO business logic.
 */
import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { Coordinates, MapOptions } from '../models/MapModel';
import { Stop } from '../models/Stop';
import { Route } from '../models/Route';
import { BusPosition } from '../models/BusPosition';
import { TripOption } from '../models/RoutePlanning';
import Navbar from './Navbar';
import TripPlannerModal from '../components/TripPlannerModal';
import BusSuggestionPanel from '../components/BusSuggestionPanel';
import RouteTrackingOverlay from '../components/RouteTrackingOverlay';
import TrackingPanel from '../components/TrackingPanel';

interface MapViewProps {
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
  selectedPlaceMarker,
  setSelectedPlaceMarker,
  currentZoom,
  onZoomChanged
}) => {
  const [showTripPlanner, setShowTripPlanner] = useState(false);
  const [showInfoWindow, setShowInfoWindow] = useState(false);
  const [showBusSuggestions, setShowBusSuggestions] = useState(false);
  const [activeTracking, setActiveTracking] = useState<TripOption | null>(null);

  // When a place is selected, also show the InfoWindow
  const handlePlaceSelectWithPopup = (place: any) => {
    handlePlaceSelect(place);
    setShowInfoWindow(true);
    setShowBusSuggestions(false);
  };

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

  // Use a ref to track the map instance for zoom change events
  const mapRef = useRef<google.maps.Map | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleZoomChanged = useCallback(() => {
    if (mapRef.current) {
      onZoomChanged(mapRef.current.getZoom() || 11);
    }
  }, [onZoomChanged]);
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
          onTripPlannerClick={() => setShowTripPlanner(true)}
          routes={routes}
          selectedRoute={selectedRoute}
          onRouteSelect={setSelectedRoute}
        />
      )}

      <TripPlannerModal
        isOpen={showTripPlanner}
        onClose={() => setShowTripPlanner(false)}
        onSelectRoute={handleSelectRoute}
      />

      {/* Bus Suggestion Panel (shown after user clicks Yes on InfoWindow) */}
      {showBusSuggestions && selectedPlaceMarker && !activeTracking && (
        <BusSuggestionPanel
          destination={{
            lat: selectedPlaceMarker.location.lat,
            lng: selectedPlaceMarker.location.lng,
            name: selectedPlaceMarker.name
          }}
          onClose={() => setShowBusSuggestions(false)}
          onSelectRoute={handleSelectRoute}
        />
      )}

      {/* Tracking Panel (bottom sheet) */}
      {activeTracking && (
        <TrackingPanel tripOption={activeTracking} onStopTracking={handleStopTracking} />
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
      >
        {/* Route Tracking Overlay (when tracking is active) */}
        {activeTracking && (
          <RouteTrackingOverlay tripOption={activeTracking} />
        )}

        {/* Render Stops as 🚏 emoji (hide during tracking for clean view) */}
        {!activeTracking && stops.map((stop) => (
          <Marker
            key={stop.STOP_ID}
            position={{
              lat: parseFloat(stop.LAT),
              lng: parseFloat(stop.LON),
            }}
            title={`${stop.STOP_NAME} (#${stop.STOP_ID})`}
            label={{
              text: '🚏',
              fontSize: '18px',
              className: 'bus-stop-emoji',
            }}
            icon={{
              path: (window as any).google?.maps?.SymbolPath?.CIRCLE,
              scale: 0,
              fillOpacity: 0,
              strokeWeight: 0,
            }}
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

        {/* Render Selected Place Marker with InfoWindow */}
        {selectedPlaceMarker && !activeTracking && (
          <Marker
            position={selectedPlaceMarker.location}
            title={selectedPlaceMarker.name}
            zIndex={200}
            onClick={() => setShowInfoWindow(true)}
          >
            {showInfoWindow && (
              <InfoWindow
                position={selectedPlaceMarker.location}
                onCloseClick={() => setShowInfoWindow(false)}
              >
                <div style={{
                  padding: '8px 4px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#202124', marginBottom: '8px' }}>
                    📍 {selectedPlaceMarker.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '12px' }}>
                    Do you want bus suggestions?
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setShowInfoWindow(false);
                        setShowBusSuggestions(true);
                      }}
                      style={{
                        padding: '6px 16px',
                        backgroundColor: '#1a73e8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Yes 🚌
                    </button>
                    <button
                      onClick={() => setShowInfoWindow(false)}
                      style={{
                        padding: '6px 16px',
                        backgroundColor: '#f1f3f4',
                        color: '#5f6368',
                        border: 'none',
                        borderRadius: '16px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      No thanks
                    </button>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}

        {/* Render Live Buses — colored by route using transitColors data */}
        {(activeTracking
          ? liveBuses.filter(bus => {
            const trackingRoutes = new Set(activeTracking.segments.map(s => s.routeNum));
            return trackingRoutes.has(String(bus.route_num));
          })
          : liveBuses
        ).map((bus) => {
          // Look up this bus's route color from the routes prop
          const matchedRoute = routes.find(r => r.ROUTE_NUM === String(bus.route_num));
          const busColor = matchedRoute?.ROUTE_COLO ? `#${matchedRoute.ROUTE_COLO}` : '#1a73e8';

          // Create an SVG bus icon as a data URL
          const busSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
              <rect x="4" y="6" width="28" height="20" rx="4" fill="${busColor}" stroke="white" stroke-width="2"/>
              <rect x="8" y="9" width="8" height="7" rx="1" fill="white" opacity="0.9"/>
              <rect x="20" y="9" width="8" height="7" rx="1" fill="white" opacity="0.9"/>
              <circle cx="11" cy="28" r="3" fill="${busColor}" stroke="white" stroke-width="1.5"/>
              <circle cx="25" cy="28" r="3" fill="${busColor}" stroke="white" stroke-width="1.5"/>
              <rect x="4" y="18" width="28" height="3" fill="${busColor}" opacity="0.8"/>
              <text x="18" y="23" text-anchor="middle" font-size="7" font-weight="bold" fill="white" font-family="Arial">${bus.route_num}</text>
            </svg>
          `)}`;

          return (
            <Marker
              key={bus.bus_id}
              position={{ lat: bus.lat, lng: bus.lng }}
              icon={{
                url: busSvg,
                scaledSize: new google.maps.Size(36, 36),
                anchor: new google.maps.Point(18, 18),
              }}
              title={`Bus #${bus.bus_id} — Route ${bus.route_num} (${bus.line_name})`}
              zIndex={100}
            />
          );
        })}
      </GoogleMap>
    </div>
  );
};
