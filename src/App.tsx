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

import './App.css';

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAnalyticsBeacon } from './controllers/hooks/useAnalyticsBeacon';
import { AuthProvider, useAuth } from './models/context/AuthContext';
import { FeatureAccessProvider } from './models/context/FeatureAccessContext';
import ProtectedRoute from './views/components/ProtectedRoute';
import PublicOnlyRoute from './views/components/PublicOnlyRoute';
import AdminRoute from './views/components/AdminRoute';
import ProfilePage from './views/auth/ProfilePage';
import logo from './New-Image.jpeg';

/* ── Lazy-loaded pages (code-split per route) ────────────────────── */
const MapPage = React.lazy(() => import('./views/MapPage'));
const LandingPage = React.lazy(() => import('./views/landing/LandingPage'));
const LoginPage = React.lazy(() => import('./views/auth/LoginPage'));
const SignupPage = React.lazy(() => import('./views/auth/SignupPage'));
const ConnectPage = React.lazy(() => import('./views/ConnectPage'));
const AdminLayout = React.lazy(() => import('./views/layouts/AdminLayout'));
const Dashboard = React.lazy(() => import('./views/admin/Dashboard'));
const RouteManager = React.lazy(() => import('./views/admin/RouteManager'));
const UserManager = React.lazy(() => import('./views/admin/UserManager'));
const VisitorAnalytics = React.lazy(() => import('./views/admin/VisitorAnalytics'));
const FeatureAccessControl = React.lazy(() => import('./views/admin/FeatureAccessControl'));

/**
 * AppRoutes — renders all routes ONLY after auth state has been resolved.
 * While isLoading is true (Supabase session check in progress), a branded
 * full-screen loader is shown instead. This prevents blank screens on refresh.
 */
function AppRoutes() {
    const { isLoading } = useAuth();
    useAnalyticsBeacon();

    // Register service worker once on first load (enables push notifications)
    React.useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        }
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA]">
                {/* Logo */}
                <img
                    src={logo}
                    alt="GoTransit Regina"
                    className="w-16 h-16 rounded-2xl object-cover mb-6"
                    style={{ boxShadow: '0 8px 24px rgba(0,61,165,0.2)' }}
                />
                {/* Spinner ring */}
                <div
                    className="w-8 h-8 border-[3px] border-[#003DA5]/20 border-t-[#003DA5] rounded-full animate-spin"
                />
                <p className="mt-4 text-sm font-medium text-gray-400 tracking-wide">Loading…</p>
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
                <div className="w-7 h-7 border-[3px] border-[#003DA5]/20 border-t-[#003DA5] rounded-full animate-spin" />
            </div>
        }>
            <Routes>

                {/* ── Landing Page (default) ─────────────────────────────── */}
                <Route path="/" element={<LandingPage />} />

                {/* ── Public-only Auth Pages ─────────────────────────────── */}
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
                    <Route path="fac" element={<FeatureAccessControl />} />
                </Route>

                {/* ── Public: /connect — Meet the Team ─────────────────── */}
                <Route path="/connect" element={<ConnectPage />} />

                {/* ── Legacy redirect: /landing still works ─────────────── */}
                <Route path="/landing" element={<LandingPage />} />

                {/* ── 404 fallback ──────────────────────────────────────── */}
                <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
        </Suspense>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <FeatureAccessProvider>
                    <AppRoutes />
                </FeatureAccessProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
