/*
This file is the Frontend Root("Brain of Frontend UI"). It is rendered by index.tsx
1. Combines all components
2. Sets up layout
3. Parent component for all other components
4. Passes data from controller to view

Auth Architecture:
- <AuthProvider> wraps the entire app — provides isAuthenticated + login/logout to all children
- <ProtectedRoute>  — redirects to /login if user is not authenticated
- <PublicOnlyRoute> — redirects to /map if user IS already authenticated (prevents re-visiting login)

Route Map:
  /          → LandingPage          (public)
  /login     → LoginPage            (public only — bounces logged-in users to /map)
  /signup    → SignupPage           (public only — bounces logged-in users to /map)
  /map       → MapPage              (protected — requires login)
  /profile   → ProfilePage         (protected — requires login)
  /admin/*   → Admin panel         (admin only — requires role = 'admin' in profiles)
*/

import React from 'react';
import './App.css';
import { useMapController } from './controllers/useMapController';
import { MapView } from './views/MapView';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './views/admin/Dashboard';
import RouteManager from './views/admin/RouteManager';
import UserManager from './views/admin/UserManager';
import VisitorAnalytics from './views/admin/VisitorAnalytics';
import LandingPage from './views/landing/LandingPage';
import LoginPage from './views/auth/LoginPage';
import SignupPage from './views/auth/SignupPage';
import ProfilePage from './views/auth/ProfilePage';
import { useAnalyticsBeacon } from './hooks/useAnalyticsBeacon';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import AdminRoute from './components/AdminRoute';
import ConnectPage from './views/ConnectPage';

/**
 * MapPage — Wrapper that scopes the map controller to this route only.
 * The controller (Google Maps loading, API polling, data fetching)
 * now only runs when the user is on the "/map" route.
 */
function MapPage() {
  const {
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
  } = useMapController();

  return (
    <MapView
      isLoaded={isLoaded}
      loadError={loadError}
      center={center}
      setCenter={setCenter}
      options={options}
      containerStyle={containerStyle}
      zoom={zoom}
      setZoom={setZoom}
      stops={stops}
      routes={routes}
      selectedRoute={selectedRoute}
      setSelectedRoute={setSelectedRoute}
      routePaths={routePaths}
      liveBuses={liveBuses}
      handlePlaceSelect={handlePlaceSelect}
      selectedPlaceMarker={selectedPlaceMarker}
      setSelectedPlaceMarker={setSelectedPlaceMarker}
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
      {/* AuthProvider must wrap everything so all routes can access auth state */}
      <AuthProvider>
        <Routes>

          {/* ── Landing Page (default) ─────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />

          {/* ── Public-only Auth Pages ─────────────────────────────── */}
          {/* Logged-in users are bounced to /map if they try to visit these */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnlyRoute>
                <SignupPage />
              </PublicOnlyRoute>
            }
          />

          {/* ── Protected Pages ────────────────────────────────────── */}
          {/* Unauthenticated users are redirected to /login */}
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <MapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* ── Admin Routes (admin role only) ─────────────────────── */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="routes" element={<RouteManager />} />
            <Route path="users" element={<UserManager />} />
            <Route path="analytics" element={<VisitorAnalytics />} />
          </Route>


          {/* ── Public: /connect — Meet the Team ─────────────────── */}
          <Route path="/connect" element={<ConnectPage />} />

          {/* ── Legacy redirect: /landing still works ─────────────── */}
          <Route path="/landing" element={<LandingPage />} />

          {/* ── 404 fallback ──────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
