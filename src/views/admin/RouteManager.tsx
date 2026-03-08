/**
 * RouteManager.tsx — GoTransit Regina  [VIEW — MVC]
 *
 * Shows all Regina Transit routes loaded from the static dataset.
 * Columns: Route Id/Bus No. · Route Name · Status · Total Stops · Last Updated · Actions
 * Actions: Rename · Show/Hide
 */

import React from 'react';
import StatusBadge from '../../components/admin/StatusBadge';
import { Edit2, Eye, EyeOff, Search } from 'lucide-react';
import { useRouteManagerController } from '../../controllers/admin/useRouteManagerController';
import { Route } from '../../models/admin/AdminTypes';

export default function RouteManager() {
    const {
        routes, totalRoutes, activeRoutes, loading,
        searchTerm, setSearchTerm,
        isRenameOpen, selectedRoute, renameValue, setRenameValue,
        openRename, confirmRename, closeRename,
        toggleStatus,
    } = useRouteManagerController();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">Loading routes…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Route Management</h1>
                    <p className="text-gray-500">
                        {activeRoutes} active · {totalRoutes - activeRoutes} hidden · {totalRoutes} total
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="relative max-w-xs">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search routes…"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 text-left border-b border-gray-100">
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Route Id</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Route Name</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Total Stops</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Updated</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {routes.map(route => (
                                <tr key={route.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-3 font-bold text-gray-900 text-sm">{route.route_num}</td>
                                    <td className="px-6 py-3 text-sm text-gray-800">{route.route_name}</td>
                                    <td className="px-6 py-3"><StatusBadge status={route.status} /></td>
                                    <td className="px-6 py-3 text-sm text-gray-500 text-center">—</td>
                                    <td className="px-6 py-3 text-sm text-gray-500">{route.last_updated}</td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openRename(route)}
                                                title="Rename route"
                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                                            >
                                                <Edit2 size={12} /> Rename
                                            </button>
                                            <button
                                                onClick={() => toggleStatus(route.id)}
                                                title={route.status === 'Active' ? 'Hide route' : 'Show route'}
                                                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition ${route.status === 'Active'
                                                        ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                                                        : 'text-green-600 bg-green-50 hover:bg-green-100'
                                                    }`}
                                            >
                                                {route.status === 'Active' ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {routes.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">
                                        No routes match your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Rename Modal */}
            {isRenameOpen && selectedRoute && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeRename} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Rename Route #{selectedRoute.route_num}</h3>
                        <p className="text-sm text-gray-500 mb-4">Current: {selectedRoute.route_name}</p>
                        <input
                            type="text"
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') closeRename(); }}
                            autoFocus
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 mb-4"
                        />
                        <div className="flex gap-3">
                            <button onClick={closeRename} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={confirmRename} className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
