/**
 Only responsible for UX/UI rendering. 
 It receives all data as props and determines how the map looks on screen. It contains NO business logic.
 */
import React from 'react';
import { GoogleMap, GoogleMapProps } from '@react-google-maps/api';
import { Coordinates, MapOptions } from '../models/MapModel';

interface MapViewProps {
  isLoaded: boolean;
  loadError: Error | undefined;
  center: Coordinates;
  options: MapOptions;
  containerStyle: React.CSSProperties;
  zoom: number;
}

/**
 * @component MapView
 * @usage <MapView isLoaded={...} center={...} />
 */
export const MapView: React.FC<MapViewProps> = ({ isLoaded, loadError, center, options, containerStyle, zoom }) => {
  if (loadError) return <div>Error Loading maps</div>;
  if (!isLoaded) return <div>Loading Maps...</div>;

  return (
    <div>
      <h1 className="Logo text-4xl font-bold text-center my-4 font-sans text-blue-600">
        GoTransitRegina{" "}
        <span role="img" aria-label="Bus Stop">
          🚏
        </span>
      </h1>
      {/* Search component omitted for brevity as per original App.js placeholder */}

      {/* GoogleMap Component */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        zoom={zoom}
        center={center}
        options={options}
      />
    </div>
  );
};
