import { useState } from 'react';
import { mockRoutes } from '../../data/mock/adminMockData';
import { Route } from '../../models/admin/AdminTypes';

export function useRouteManagerController() {
    const [routes, setRoutes] = useState<Route[]>(mockRoutes);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

    // Filter Data
    const filteredRoutes = routes.filter(r =>
        r.route_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.route_num.toString().includes(searchTerm)
    );

    const handleEdit = (route: Route) => {
        setSelectedRoute(route);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setSelectedRoute(null);
        setIsModalOpen(true);
    };

    const toggleStatus = (id: string) => {
        setRoutes(routes.map(r =>
            r.id === id ? { ...r, status: r.status === 'Active' ? 'Hidden' : 'Active' } : r
        ));
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedRoute(null);
    };

    return {
        routes: filteredRoutes,
        searchTerm,
        setSearchTerm,
        isModalOpen,
        selectedRoute,
        handleEdit,
        handleAddNew,
        toggleStatus,
        closeModal
    };
}
