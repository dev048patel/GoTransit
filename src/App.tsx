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
import LandingPage from './views/landing/LandingPage';

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
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/landing" element={<LandingPage />} />

        {/* Map View */}
        <Route path="/" element={
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
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="routes" element={<RouteManager />} />
          <Route path="users" element={<UserManager />} />
          <Route path="notifications" element={<NotificationCenter />} />
          <Route path="health" element={<SystemHealth />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<div>Settings Component Coming Soon</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
