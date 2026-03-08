/**
 * useRouteManagerController.ts — GoTransit Regina  [MVC Controller]
 *
 * Drives the Route Manager admin page.
 * Fetches route data from the backend API and persists changes
 * (rename, hide/show) via PATCH requests with optimistic UI updates.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Route } from '../../models/admin/AdminTypes';

const baseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function useRouteManagerController() {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Rename modal state
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Fetch routes from backend on mount
    const fetchRoutes = useCallback(async () => {
        try {
            const res = await fetch(`${baseUrl}/api/admin/routes`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data: Route[] = await res.json();
            setRoutes(data.sort((a, b) => a.route_num - b.route_num));
        } catch (err) {
            console.error('Error fetching admin routes:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

    const filteredRoutes = useMemo(() =>
        routes.filter(r =>
            r.route_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.route_num.toString().includes(searchTerm)
        ),
        [routes, searchTerm]
    );

    const openRename = (route: Route) => {
        setSelectedRoute(route);
        setRenameValue(route.route_name);
        setIsRenameOpen(true);
    };

    // Optimistic rename — update UI instantly, persist in background
    const confirmRename = async () => {
        if (!selectedRoute || !renameValue.trim()) return;

        const oldName = selectedRoute.route_name;
        const newName = renameValue.trim();

        // 1. Optimistic update
        setRoutes(prev =>
            prev.map(r => r.id === selectedRoute.id ? { ...r, route_name: newName, last_updated: 'Admin Override' } : r)
        );
        setIsRenameOpen(false);
        setSelectedRoute(null);

        // 2. Persist to backend
        try {
            const res = await fetch(`${baseUrl}/api/admin/routes/${selectedRoute.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ route_name: newName }),
            });
            if (!res.ok) throw new Error('Failed to save');
        } catch (err) {
            // Rollback on failure
            console.error('Error saving rename:', err);
            setRoutes(prev =>
                prev.map(r => r.id === selectedRoute.id ? { ...r, route_name: oldName } : r)
            );
        }
    };

    const closeRename = () => {
        setIsRenameOpen(false);
        setSelectedRoute(null);
    };

    // Optimistic toggle — update UI instantly, persist in background
    const toggleStatus = async (id: string) => {
        const route = routes.find(r => r.id === id);
        if (!route) return;

        const newStatus = route.status === 'Active' ? 'Hidden' : 'Active';

        // 1. Optimistic update
        setRoutes(prev =>
            prev.map(r => r.id === id ? { ...r, status: newStatus, last_updated: 'Admin Override' } : r)
        );

        // 2. Persist to backend
        try {
            const res = await fetch(`${baseUrl}/api/admin/routes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hidden: newStatus === 'Hidden' }),
            });
            if (!res.ok) throw new Error('Failed to save');
        } catch (err) {
            // Rollback on failure
            console.error('Error saving status:', err);
            setRoutes(prev =>
                prev.map(r => r.id === id ? { ...r, status: route.status } : r)
            );
        }
    };

    return {
        routes: filteredRoutes,
        totalRoutes: routes.length,
        activeRoutes: routes.filter(r => r.status === 'Active').length,
        loading,
        searchTerm,
        setSearchTerm,
        isRenameOpen,
        selectedRoute,
        renameValue,
        setRenameValue,
        openRename,
        confirmRename,
        closeRename,
        toggleStatus,
    };
}
