/**
 * AdminRoute.tsx — GoTransit Regina
 *
 * Guards all /admin/* routes. Three states:
 *  - Loading   → shows a spinner while the session + role are being fetched
 *  - Not authenticated → redirects to /login
 *  - Authenticated but not admin → redirects to /map
 *  - Admin → renders children normally
 *
 * Role is fetched from public.profiles on every page load.
 * To grant admin access: go to Supabase → Table Editor → profiles →
 * find the user → change `role` from 'user' to 'admin'.
 * The change takes effect on the user's next page refresh.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminRouteProps {
    children: React.ReactElement;
}

export default function AdminRoute({ children }: AdminRouteProps) {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();
    const location = useLocation();

    // Wait for session + role to load before making a redirect decision
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!isAdmin) {
        return <Navigate to="/map" replace />;
    }

    return children;
}
