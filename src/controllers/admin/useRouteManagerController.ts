/**
 * useRouteManagerController.ts — GoTransit Regina  [MVC Controller]
 *
 * Drives the Route Manager admin page using REAL data from the static
 * Regina Transit dataset (transitRoutes.ts).
 *
 * - Status (Active / Hidden) is local state — routes come from open-data
 *   static file, not a DB, so no server persistence needed.
 * - Rename is also held in local state.
 */

import { useState, useMemo } from 'react';
import transitRoutes from '../../data/transitRoutes';
import { Route } from '../../models/admin/AdminTypes';

function buildInitialRoutes(): Route[] {
    return transitRoutes
        .slice()
        .sort((a, b) => parseInt(a.ROUTE_NUM, 10) - parseInt(b.ROUTE_NUM, 10))
        .map(r => ({
            id: r.ROUTE_ID,
            route_num: parseInt(r.ROUTE_NUM, 10),
            route_name: r.ROUTE_NAME,
            status: 'Active' as const,
            stops_count: 0,
            last_updated: 'Static Data',
        }));
}

export function useRouteManagerController() {
    const [routes, setRoutes] = useState<Route[]>(buildInitialRoutes);
    const [searchTerm, setSearchTerm] = useState('');

    // Rename modal state
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
    const [renameValue, setRenameValue] = useState('');

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

    const confirmRename = () => {
        if (!selectedRoute || !renameValue.trim()) return;
        setRoutes(prev =>
            prev.map(r => r.id === selectedRoute.id ? { ...r, route_name: renameValue.trim() } : r)
        );
        setIsRenameOpen(false);
        setSelectedRoute(null);
    };

    const closeRename = () => {
        setIsRenameOpen(false);
        setSelectedRoute(null);
    };

    const toggleStatus = (id: string) => {
        setRoutes(prev =>
            prev.map(r => r.id === id ? { ...r, status: r.status === 'Active' ? 'Hidden' : 'Active' } : r)
        );
    };

    return {
        routes: filteredRoutes,
        totalRoutes: routes.length,
        activeRoutes: routes.filter(r => r.status === 'Active').length,
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
