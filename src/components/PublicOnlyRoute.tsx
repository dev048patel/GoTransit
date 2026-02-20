/**
 * PublicOnlyRoute.tsx — GoTransit Regina
 *
 * Wraps Login and Signup so that already-logged-in users who navigate
 * to /login or /signup via the URL bar are redirected to /map instead.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PublicOnlyRouteProps {
    children: React.ReactElement;
}

export default function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
    const { isAuthenticated } = useAuth();

    if (isAuthenticated) {
        return <Navigate to="/map" replace />;
    }

    return children;
}
