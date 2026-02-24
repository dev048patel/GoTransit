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

import { Component, Suspense, lazy } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
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

/* ── Suspense wrapper — each lazy component gets its own boundary ── */
function Lazy({ children }: { children: ReactNode }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            {children}
        </Suspense>
    );
}

/* ── Error Boundary — catches render errors from lazy imports ────── */
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    state = { hasError: false };
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[GoTransit] Route load failed:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
                    <p className="text-gray-600 text-lg">Something went wrong loading this page.</p>
                    <button
                        onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                        Reload
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function App() {
    // Send analytics beacon once on site load, heartbeat every 60s
    useAnalyticsBeacon();

    return (
        <BrowserRouter>
            {/* AuthProvider must wrap everything so all routes can access auth state */}
            <AuthProvider>
                <ErrorBoundary>
                    <Routes>

                        {/* ── Landing Page (default) ─────────────────────────────── */}
                        <Route path="/" element={<Lazy><LandingPage /></Lazy>} />

                        {/* ── Public-only Auth Pages ─────────────────────────────── */}
                        <Route
                            path="/login"
                            element={
                                <PublicOnlyRoute>
                                    <Lazy><LoginPage /></Lazy>
                                </PublicOnlyRoute>
                            }
                        />
                        <Route
                            path="/signup"
                            element={
                                <PublicOnlyRoute>
                                    <Lazy><SignupPage /></Lazy>
                                </PublicOnlyRoute>
                            }
                        />

                        {/* ── Protected Pages ────────────────────────────────────── */}
                        <Route
                            path="/map"
                            element={
                                <ProtectedRoute>
                                    <Lazy><MapPage /></Lazy>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/profile"
                            element={
                                <ProtectedRoute>
                                    <Lazy><ProfilePage /></Lazy>
                                </ProtectedRoute>
                            }
                        />

                        {/* ── Admin Routes (admin role only) ─────────────────────── */}
                        <Route
                            path="/admin"
                            element={
                                <AdminRoute>
                                    <Lazy><AdminLayout /></Lazy>
                                </AdminRoute>
                            }
                        >
                            <Route index element={<Lazy><Dashboard /></Lazy>} />
                            <Route path="routes" element={<Lazy><RouteManager /></Lazy>} />
                            <Route path="users" element={<Lazy><UserManager /></Lazy>} />
                            <Route path="analytics" element={<Lazy><VisitorAnalytics /></Lazy>} />
                        </Route>

                        {/* ── Public: /connect — Meet the Team ─────────────────── */}
                        <Route path="/connect" element={<Lazy><ConnectPage /></Lazy>} />

                        {/* ── Legacy redirect: /landing still works ─────────────── */}
                        <Route path="/landing" element={<Lazy><LandingPage /></Lazy>} />

                        {/* ── 404 fallback ──────────────────────────────────────── */}
                        <Route path="*" element={<Navigate to="/" replace />} />

                    </Routes>
                </ErrorBoundary>
            </AuthProvider>
        </BrowserRouter>
    );
}
