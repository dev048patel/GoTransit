/**
 Only responsible for UX/UI rendering. 
 It receives all data as props and determines how the map looks on screen. It contains NO business logic.
 */
import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { Coordinates } from '../models/MapModel';
import { TripOption } from '../models/transit/RoutePlanning';
import { BusPosition } from '../models/transit/BusPosition';
import { Stop } from '../models/transit/Stop';
import { MapViewProps } from '../models/views/MapViewProps';
import transitColors from '../models/data/transitColors';
import StopDetailPanel from './components/transit/StopDetailPanel';
import Navbar from './Navbar';
import TripPlannerModal from './components/transit/TripPlannerModal';
import BusSuggestionPanel from './components/transit/BusSuggestionPanel';
import RouteTrackingOverlay from './components/transit/RouteTrackingOverlay';
import TrackingPanel from './components/transit/TrackingPanel';

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
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [showStopDetail, setShowStopDetail] = useState(false);

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
    setShowStopDetail(false);
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

  // Go back to suggestions without clearing the destination
  const handleBackToSuggestions = () => {
    setActiveTracking(null);
    setShowBusSuggestions(true);
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
          liveBuses={liveBuses}
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
          // Top-down bus faces up (North = 0°), so heading maps directly
          const rotation = bus.heading || 0;

          // Top-down bus SVG — rotates naturally in any direction
          const busSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <g transform="rotate(${rotation}, 20, 20)">
                <!-- Shadow -->
                <ellipse cx="20" cy="20" rx="10" ry="16" fill="rgba(0,0,0,0.15)"/>
                <!-- Bus body -->
                <rect x="11" y="5" width="18" height="30" rx="5" fill="${busColor}" stroke="white" stroke-width="1.5"/>
                <!-- Windshield (front/top) -->
                <rect x="13" y="6" width="14" height="6" rx="3" fill="white" opacity="0.8"/>
                <!-- Side windows -->
                <rect x="12" y="14" width="4" height="4" rx="1" fill="white" opacity="0.6"/>
                <rect x="24" y="14" width="4" height="4" rx="1" fill="white" opacity="0.6"/>
                <rect x="12" y="20" width="4" height="4" rx="1" fill="white" opacity="0.6"/>
                <rect x="24" y="20" width="4" height="4" rx="1" fill="white" opacity="0.6"/>
                <!-- Rear window -->
                <rect x="14" y="30" width="12" height="3" rx="1.5" fill="white" opacity="0.5"/>
                <!-- Route number -->
                <text x="20" y="29" text-anchor="middle" font-size="8" font-weight="bold" fill="white" font-family="Arial, sans-serif">${bus.route_num}</text>
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
