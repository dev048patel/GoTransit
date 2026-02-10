/**
 Only responsible for UX/UI rendering. 
 It receives all data as props and determines how the map looks on screen. It contains NO business logic.
 */
import React, { useState } from 'react';
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
  setSelectedPlaceMarker
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

  if (loadError) return <div>Error Loading maps</div>;
  if (!isLoaded) return <div>Loading Maps...</div>;

  const currentRoute = routes.find(r => r.ROUTE_NUM === selectedRoute);
  const routeColor = currentRoute?.ROUTE_COLO ? `#${currentRoute.ROUTE_COLO}` : '#FF0000';

  return (
    <div className="relative h-screen w-full">
      {/* Hide Navbar when tracking is active for clean view */}
      {!activeTracking && (
        <Navbar onPlaceSelect={handlePlaceSelectWithPopup} onTripPlannerClick={() => setShowTripPlanner(true)} />
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

        {/* Render Live Buses (filter to selected route during tracking) */}
        {(activeTracking
          ? liveBuses.filter(bus => {
            const trackingRoutes = new Set(activeTracking.segments.map(s => s.routeNum));
            return trackingRoutes.has(String(bus.route_num));
          })
          : liveBuses
        ).map((bus) => (
          <Marker
            key={bus.bus_id}
            position={{ lat: bus.lat, lng: bus.lng }}
            icon={{
              path: (window as any).google?.maps?.SymbolPath?.FORWARD_CLOSED_ARROW,
              scale: 5,
              fillColor: '#00CC00',
              fillOpacity: 1,
              strokeWeight: 1,
              strokeColor: '#000000',
              rotation: bus.heading,
            }}
            title={`Bus #${bus.bus_id} (${bus.line_name})`}
            label={{
              text: bus.route_num?.toString() || "",
              color: "#000000",
              fontWeight: "bold",
              fontSize: "12px",
              className: "bg-white px-1 rounded"
            }}
            zIndex={100}
          />
        ))}
      </GoogleMap>
    </div>
  );
};
