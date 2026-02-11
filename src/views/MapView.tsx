/**
 Only responsible for UX/UI rendering. 
 It receives all data as props and determines how the map looks on screen. It contains NO business logic.
 */
import React from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { Coordinates, MapOptions } from '../models/MapModel';
import { Stop } from '../models/Stop';
import { Route } from '../models/Route';
import { BusPosition } from '../models/BusPosition';
import Navbar from './Navbar';

interface MapViewProps {
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

/*
 -> <MapView isLoaded={...} center={...} />
 */
export const MapView: React.FC<MapViewProps> = ({
  isLoaded,
  loadError,
  center,
  options,
  containerStyle,
  zoom,
  stops,
  routes,
  selectedRoute,
  setSelectedRoute,
  routePaths,
  liveBuses
}) => {
  if (loadError) return <div>Error Loading maps</div>;
  if (!isLoaded) return <div>Loading Maps...</div>;

  const currentRoute = routes.find(r => r.ROUTE_NUM === selectedRoute);
  const routeColor = currentRoute?.ROUTE_COLO ? `#${currentRoute.ROUTE_COLO}` : '#FF0000';

  return (
    <div className="relative h-screen w-full">
      <Navbar />

      {/* GoogleMap Component */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        zoom={zoom}
        center={center}
        options={options}
      >
        {/* Render Stops */}
        {stops.map((stop) => (
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

        {/* Render Route Polylines */}
        {routePaths.map((path, index) => (
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

        {/* Render Live Buses */}
        {liveBuses.map((bus) => (
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
            }}
            zIndex={100}
          />
        ))}
      </GoogleMap>
    </div>
  );
};
