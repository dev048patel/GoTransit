/**
 * ProtectedRoute.tsx — GoTransit Regina
 *
 * Wraps any route that requires authentication.
 * - If the user IS authenticated → renders children normally.
 * - If the user is NOT authenticated → redirects to /login,
 *   preserving the attempted URL in `state.from` so LoginPage
 *   can redirect back after a successful login.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactElement;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        // Replace: so the user can't press Back to reach the protected page
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}
