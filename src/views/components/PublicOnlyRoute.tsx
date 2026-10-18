/**
 * PublicOnlyRoute.tsx — Transit Regina
 *
 * Wraps Login and Signup so that already-logged-in users are redirected to /map.
 * - While auth is loading  → shows nothing (avoids flash of login page on refresh)
 * - If authenticated       → redirects to /map
 * - If not authenticated   → renders children normally
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../models/context/AuthContext';
import { useTermsAcceptance } from '../../controllers/auth/useTermsAcceptance';

interface PublicOnlyRouteProps {
    children: React.ReactElement;
}

export default function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
    const { isAuthenticated, isLoading } = useAuth();
    const terms = useTermsAcceptance();
    const location = useLocation();

    if (isLoading || terms.checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (isAuthenticated) {
        // Signed in but not yet agreed: the agreement step is on the sign-in page
        if (terms.needed) return location.pathname === '/login' ? children : <Navigate to="/login" replace />;
        // Done: carry on to the page they were trying to reach
        const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/map';
        return <Navigate to={from} replace />;
    }

    return children;
}
