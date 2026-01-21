/*
This file is the Frontend Root("Brain of Frontend UI"). It is rendered by index.tsx
1. Combines all components
2. Sets up layout
3. Parent component for all other components
4. Passes data from controller to view
*/

import React from 'react';
import './App.css';
import { useMapController } from './controllers/useMapController';
import { MapView } from './views/MapView';

export default function App() {
  // Controller: Handles logic and state
  const {
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
  } = useMapController();

  // View: Renders the UI with data from the controller
  return (
    <MapView
      isLoaded={isLoaded}
      loadError={loadError}
      center={center}
      options={options}
      containerStyle={containerStyle}
      zoom={zoom}
      stops={stops}
      routes={routes}
      selectedRoute={selectedRoute}
      setSelectedRoute={setSelectedRoute}
      routePaths={routePaths}
      liveBuses={liveBuses}
    />
  );
}
