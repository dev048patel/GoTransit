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
  const [selectedBus, setSelectedBus] = useState<BusPosition | null>(null);

  // Convert heading degrees to compass direction
  const getDirection = (heading: number): string => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(heading / 45) % 8;
    return dirs[index];
  };

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

        {/* Render Stops (hide during tracking for clean view) */}
        {!activeTracking && stops.map((stop) => (
          <Marker
            key={stop.STOP_ID}
            position={{
              lat: parseFloat(stop.LAT),
              lng: parseFloat(stop.LON),
            }}
            title={`${stop.STOP_NAME} (#${stop.STOP_ID})`}
            icon={{
              path: (window as any).google?.maps?.SymbolPath?.CIRCLE,
              scale: 3,
              fillColor: '#2196F3',
              fillOpacity: 1,
              strokeWeight: 1,
              strokeColor: '#ffffff',
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

          // Rotation: heading is 0=N, 90=E, 180=S, 270=W
          // SVG bus faces right (East = 90°), so offset by -90
          const rotation = (bus.heading || 0) - 90;

          // Side-view bus SVG icon matching user's reference image, rotated by heading
          const busSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <g transform="rotate(${rotation}, 20, 20)">
                <!-- Bus body -->
                <rect x="5" y="12" width="30" height="14" rx="3" fill="${busColor}" stroke="white" stroke-width="1.5"/>
                <!-- Roof curve -->
                <path d="M8 12 Q8 8 12 8 L28 8 Q32 8 32 12" fill="${busColor}" stroke="white" stroke-width="1.5"/>
                <!-- Windows -->
                <rect x="10" y="10" width="5" height="6" rx="1" fill="white" opacity="0.85"/>
                <rect x="17" y="10" width="5" height="6" rx="1" fill="white" opacity="0.85"/>
                <rect x="24" y="10" width="5" height="6" rx="1" fill="white" opacity="0.85"/>
                <!-- Windshield -->
                <path d="M32 12 L35 14 L35 22 L32 24" fill="white" opacity="0.7" stroke="white" stroke-width="0.5"/>
                <!-- Route number on body -->
                <text x="20" y="24" text-anchor="middle" font-size="7" font-weight="bold" fill="white" font-family="Arial, sans-serif">${bus.route_num}</text>
                <!-- Wheels -->
                <circle cx="12" cy="28" r="2.5" fill="#333" stroke="white" stroke-width="1"/>
                <circle cx="28" cy="28" r="2.5" fill="#333" stroke="white" stroke-width="1"/>
                <!-- Wheel wells -->
                <rect x="9" y="25" width="6" height="3" rx="1.5" fill="${busColor}"/>
                <rect x="25" y="25" width="6" height="3" rx="1.5" fill="${busColor}"/>
              </g>
            </svg>
          `)}`;

          return (
            <Marker
              key={bus.bus_id}
              position={{ lat: bus.lat, lng: bus.lng }}
              icon={{
                url: busSvg,
                scaledSize: new google.maps.Size(40, 40),
                anchor: new google.maps.Point(20, 20),
              }}
              title={`Bus #${bus.bus_id} — Route ${bus.route_num} (${bus.line_name})`}
              zIndex={100}
              onClick={() => {
                setSelectedBus(bus);
                setSelectedRoute(String(bus.route_num));
              }}
            >
              {/* Bus Info Window */}
              {selectedBus && selectedBus.bus_id === bus.bus_id && (
                <InfoWindow
                  position={{ lat: bus.lat, lng: bus.lng }}
                  onCloseClick={() => setSelectedBus(null)}
                >
                  <div style={{
                    padding: '8px 4px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    minWidth: '200px'
                  }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#202124', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: busColor,
                        color: 'white',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '13px',
                        fontWeight: '700'
                      }}>Route {bus.route_num}</span>
                      {bus.line_name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#5f6368', lineHeight: '1.8' }}>
                      <div>🚌 <strong>Bus ID:</strong> {bus.bus_id}</div>
                      <div>🧭 <strong>Heading:</strong> {bus.heading}° ({getDirection(bus.heading)})</div>
                      <div>💨 <strong>Speed:</strong> {bus.speed > 0 ? `${bus.speed} km/h` : 'Stopped'}</div>
                      <div>📍 <strong>Position:</strong> {bus.lat.toFixed(5)}, {bus.lng.toFixed(5)}</div>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          );
        })}
      </GoogleMap>
    </div>
  );
};
