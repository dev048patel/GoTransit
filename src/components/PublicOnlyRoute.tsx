/**
 * PublicOnlyRoute.tsx — GoTransit Regina
 *
 * Wraps Login and Signup so that already-logged-in users are redirected to /map.
 * - While auth is loading  → shows nothing (avoids flash of login page on refresh)
 * - If authenticated       → redirects to /map
 * - If not authenticated   → renders children normally
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PublicOnlyRouteProps {
    children: React.ReactElement;
}

export default function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) return null;

    if (isAuthenticated) {
        return <Navigate to="/map" replace />;
    }

    return children;
}
