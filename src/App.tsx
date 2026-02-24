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

Performance:
  All route components are lazy-loaded with React.lazy().
  Each page's JS is only downloaded when the user first navigates there.
  The initial bundle (landing page) is therefore a fraction of the total.
*/

import { Suspense, lazy } from 'react';
import './App.css';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAnalyticsBeacon } from './hooks/useAnalyticsBeacon';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import AdminRoute from './components/AdminRoute';

/* ── Lazy-loaded route components ────────────────────────────────── */
const MapPage          = lazy(() => import('./views/MapPage'));
const LandingPage      = lazy(() => import('./views/landing/LandingPage'));
const LoginPage        = lazy(() => import('./views/auth/LoginPage'));
const SignupPage       = lazy(() => import('./views/auth/SignupPage'));
const ProfilePage      = lazy(() => import('./views/auth/ProfilePage'));
const ConnectPage      = lazy(() => import('./views/ConnectPage'));
const AdminLayout      = lazy(() => import('./layouts/AdminLayout'));
const Dashboard        = lazy(() => import('./views/admin/Dashboard'));
const RouteManager     = lazy(() => import('./views/admin/RouteManager'));
const UserManager      = lazy(() => import('./views/admin/UserManager'));
const VisitorAnalytics = lazy(() => import('./views/admin/VisitorAnalytics'));

/* ── Suspense fallback — same spinner used by route guards ───────── */
function Spinner() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-8 h-8 border-4 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

export default function App() {
    // Send analytics beacon once on site load, heartbeat every 60s
    useAnalyticsBeacon();

    return (
        <BrowserRouter>
            {/* AuthProvider must wrap everything so all routes can access auth state */}
            <AuthProvider>
                <Suspense fallback={<Spinner />}>
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
                </Suspense>
            </AuthProvider>
        </BrowserRouter>
    );
}
