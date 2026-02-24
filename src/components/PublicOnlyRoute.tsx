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

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/map" replace />;
    }

    return children;
}
