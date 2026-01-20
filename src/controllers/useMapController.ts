/*
This is Frontend Part, which controls behaviour of the map.
1. Fetch Configuration from Model
2. Initialize State / External APIs (Business Logic)
3. Return prepared data for the View
*/
import { useLoadScript } from '@react-google-maps/api';
import { MapModel, Coordinates, MapOptions } from '../models/MapModel';
import React from 'react';

interface MapControllerOutput {
  isLoaded: boolean;
  loadError: Error | undefined;
  center: Coordinates;
  options: MapOptions;
  containerStyle: React.CSSProperties;
  zoom: number;
}

export const useMapController = (): MapControllerOutput => {
  // 1. Fetch Configuration from Model
  const { libraries } = MapModel;

  // 2. Initialize State / External APIs (Business Logic)
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // 3. Return prepared data for the View
  return {
    isLoaded,
    loadError,
    center: MapModel.center,
    options: MapModel.options,
    containerStyle: MapModel.containerStyle,
    zoom: MapModel.defaultZoom,
  };
};
