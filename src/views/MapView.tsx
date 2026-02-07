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
  handlePlaceSelect: (place: any) => void;
  selectedPlaceMarker: { location: Coordinates; name: string } | null;
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
  liveBuses,
  handlePlaceSelect,
  selectedPlaceMarker
}) => {
  if (loadError) return <div>Error Loading maps</div>;
  if (!isLoaded) return <div>Loading Maps...</div>;

  const currentRoute = routes.find(r => r.ROUTE_NUM === selectedRoute);
  const routeColor = currentRoute?.ROUTE_COLO ? `#${currentRoute.ROUTE_COLO}` : '#FF0000';
  
  return (
    <div className="relative h-screen w-full">
      {/* <h1 className="absolute top-0 left-0 z-10 p-4 Logo text-4xl font-bold font-sans text-blue-600 bg-white/80 w-full text-center shadow-sm backdrop-blur-sm">
        Go<span role="img" aria-label="Bus Stop">
          🚏
        </span>ransitRegina{" "}

      </h1> */}

      {/* Floating Route Selector Dropdown */}
      {/* <div className="absolute top-24 left-4 z-10 w-80">
        <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-200">
          <label htmlFor="route-select" className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase tracking-wide">
            Select Bus Route
          </label>
          <select
            id="route-select"
            onChange={(e) => setSelectedRoute(e.target.value || null)}
            value={selectedRoute || ""}
            className="w-full p-2 border border-gray-300 rounded shadow-sm bg-gray-50 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer hover:bg-white transition-colors"
          // style={{
          //   backgroundImage: `url("data:image/svg+xml,%3csvg fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          //   backgroundPosition: `right 0.5rem center`,
          //   backgroundRepeat: `no-repeat`,
          //   backgroundSize: `1.5em 1.5em`,
          //   paddingRight: `2.5rem`
          // }}
          >
            <option value="">-- Choose a Route --</option>
            {routes.map((route) => (
              <option key={`${route.ROUTE_ID}-${route.ROUTE_NUM}`} value={route.ROUTE_NUM}>
                {route.ROUTE_NUM} - {route.ROUTE_NAME}
              </option>
            ))}
          </select>
        </div>
      </div>  */}


      <Navbar onPlaceSelect={handlePlaceSelect} />


      {/* GoogleMap Component */}
      <GoogleMap
        key={`map-${center.lat}-${center.lng}`}
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

        {/* Render Route Polylines -> Comment @ END */}
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

        {/* Render Selected Place Marker */}
        {selectedPlaceMarker && (
          <Marker
            position={selectedPlaceMarker.location}
            title={selectedPlaceMarker.name}
            zIndex={200}
          />
        )}

        {/* Render Live Buses */}
        {liveBuses.map((bus) => (
          <Marker
            key={bus.bus_id}
            position={{ lat: bus.lat, lng: bus.lng }}
            icon={{
              path: (window as any).google?.maps?.SymbolPath?.FORWARD_CLOSED_ARROW,
              scale: 5,
              fillColor: '#00CC00', // Green for live buses
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
              className: "bg-white px-1 rounded" // Tailwind doesn't apply to canvas labels easily, but we try
            }}
            zIndex={100} // Top of stops
          />
        ))}
      </GoogleMap>
    </div>
  );
};
