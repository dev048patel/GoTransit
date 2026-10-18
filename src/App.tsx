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
  /forgot-password → ForgotPasswordPage (public only)
  /reset-password  → ResetPasswordPage  (public — the emailed link signs the user in, so NOT public-only)
  /map       → MapPage              (protected — requires login)
  /profile   → ProfilePage         (protected — requires login)
  /admin/*   → Admin panel         (admin only — requires role = 'admin' in profiles)
*/

import './App.css';

import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAnalyticsBeacon } from './controllers/hooks/useAnalyticsBeacon';
import { AuthProvider, useAuth } from './models/context/AuthContext';
import { FeatureAccessProvider } from './models/context/FeatureAccessContext';
import ProtectedRoute from './views/components/ProtectedRoute';
import { useTermsSessionGuard } from './controllers/auth/useTermsSessionGuard';
import PublicOnlyRoute from './views/components/PublicOnlyRoute';
import AdminRoute from './views/components/AdminRoute';
import ProfilePage from './views/auth/ProfilePage';
import logo from './New-Image.jpeg';

/* ── Lazy-loaded pages (code-split per route) ────────────────────── */
const MapPage = React.lazy(() => import('./views/MapPage'));
const LandingPage = React.lazy(() => import('./views/landing/LandingPage'));
const LoginPage = React.lazy(() => import('./views/auth/LoginPage'));
const SignupPage = React.lazy(() => import('./views/auth/SignupPage'));
const ForgotPasswordPage = React.lazy(() => import('./views/auth/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./views/auth/ResetPasswordPage'));
const ConnectPage = React.lazy(() => import('./views/ConnectPage'));
const TeamMemberPage = React.lazy(() => import('./views/TeamMemberPage'));
const LegalPage = React.lazy(() => import('./views/LegalPage'));
const AdminLayout = React.lazy(() => import('./views/layouts/AdminLayout'));
const AdminHome = React.lazy(() => import('./views/admin/AdminHome'));
const People = React.lazy(() => import('./views/admin/People'));
const PersonPage = React.lazy(() => import('./views/admin/PersonPage'));
const Insights = React.lazy(() => import('./views/admin/Insights'));
const ActivityLog = React.lazy(() => import('./views/admin/ActivityLog'));
const RouteManager = React.lazy(() => import('./views/admin/RouteManager'));
const FeatureAccessControl = React.lazy(() => import('./views/admin/FeatureAccessControl'));
const SecurityCenter = React.lazy(() => import('./views/admin/SecurityCenter'));
const TwoStepPage = React.lazy(() => import('./views/auth/TwoStepPage'));

/**
 * AppRoutes — renders all routes ONLY after auth state has been resolved.
 * While isLoading is true (Supabase session check in progress), a branded
 * full-screen loader is shown instead. This prevents blank screens on refresh.
 */
function AppRoutes() {
    /* Not agreed to the Terms and left the agreement step: signed out (see useTermsSessionGuard) */
    useTermsSessionGuard();
    /* Start every page at the top; without this a new page opens at the old page's scroll position */
    const { pathname } = useLocation();
    useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

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
                    alt="Transit Regina"
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
                <Route
                    path="/forgot-password"
                    element={
                        <PublicOnlyRoute>
                            <ForgotPasswordPage />
                        </PublicOnlyRoute>
                    }
                />
                {/* Not PublicOnly: the recovery link arrives with a live session */}
                <Route path="/reset-password" element={<ResetPasswordPage />} />

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
                {/* Two-step sign-in for admins: set up the authenticator app, or enter its code */}
                <Route
                    path="/two-step"
                    element={
                        <ProtectedRoute>
                            <TwoStepPage />
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
                    <Route index element={<AdminHome />} />
                    <Route path="people" element={<People />} />
                    <Route path="people/features" element={<FeatureAccessControl />} />
                    <Route path="people/:id" element={<PersonPage />} />
                    <Route path="service" element={<RouteManager />} />
                    <Route path="insights" element={<Insights />} />
                    <Route path="security" element={<SecurityCenter />} />
                    <Route path="activity" element={<ActivityLog />} />
                    {/* Old addresses still work */}
                    <Route path="users" element={<Navigate to="/admin/people" replace />} />
                    <Route path="fac" element={<Navigate to="/admin/people/features" replace />} />
                    <Route path="routes" element={<Navigate to="/admin/service" replace />} />
                    <Route path="analytics" element={<Navigate to="/admin/insights" replace />} />
                </Route>

                {/* ── Public: /connect — Meet the Team ─────────────────── */}
                <Route path="/connect" element={<ConnectPage />} />
                {/* Each person's own portfolio page */}
                <Route path="/connect/:slug" element={<TeamMemberPage />} />

                {/* ── Public: who runs the site, privacy and terms ─────── */}
                <Route path="/about" element={<LegalPage page="about" />} />
                <Route path="/privacy" element={<LegalPage page="privacy" />} />
                <Route path="/terms" element={<LegalPage page="terms" />} />

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
// delete it later.