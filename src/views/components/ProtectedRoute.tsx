/**
 * ProtectedRoute.tsx — Transit Regina
 *
 * Wraps any route that requires authentication.
 * - While auth is loading  → shows a spinner (prevents flash redirect on page refresh)
 * - If authenticated       → renders children normally
 * - If not authenticated   → redirects to /login, preserving the attempted URL
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../models/context/AuthContext';
import { useTermsAcceptance } from '../../controllers/auth/useTermsAcceptance';

interface ProtectedRouteProps {
    children: React.ReactElement;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, signedOutOnPurpose } = useAuth();
    const terms = useTermsAcceptance();
    const location = useLocation();

    if (isLoading || terms.checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Not signed in, or signed in but not yet agreed to the current Terms: both go through the sign-in page
    if (!isAuthenticated || terms.needed) {
        // Remember this page only if they were sent away from it, not if they just signed out of it
        return <Navigate to="/login" state={signedOutOnPurpose && !isAuthenticated ? undefined : { from: location }} replace />;
    }

    return children;
}
