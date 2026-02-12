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

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './views/admin/Dashboard';
import RouteManager from './views/admin/RouteManager';
import UserManager from './views/admin/UserManager';
import NotificationCenter from './views/admin/NotificationCenter';
import SystemHealth from './views/admin/SystemHealth';
import Reports from './views/admin/Reports';
import VisitorAnalytics from './views/admin/VisitorAnalytics';
import LandingPage from './views/landing/LandingPage';
import { useAnalyticsBeacon } from './hooks/useAnalyticsBeacon';

/**
 * MapPage — Wrapper that scopes the map controller to this route only.
 * The controller (Google Maps loading, API polling, data fetching)
 * now only runs when the user is on the "/" route.
 */
function MapPage() {
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
    liveBuses,
    currentZoom,
    onZoomChanged
  } = useMapController();

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
      currentZoom={currentZoom}
      onZoomChanged={onZoomChanged}
    />
  );
}

export default function App() {
  // Send analytics beacon once on site load, heartbeat every 60s
  useAnalyticsBeacon();

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/landing" element={<LandingPage />} />

        {/* Map View — Controller only runs on this route */}
        <Route path="/" element={<MapPage />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="routes" element={<RouteManager />} />
          <Route path="users" element={<UserManager />} />
          <Route path="notifications" element={<NotificationCenter />} />
          <Route path="health" element={<SystemHealth />} />
          <Route path="reports" element={<Reports />} />
          <Route path="analytics" element={<VisitorAnalytics />} />
          <Route path="settings" element={<div>Settings Component Coming Soon</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

