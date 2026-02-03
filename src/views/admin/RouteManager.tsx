import React from 'react';
import DataTable from '../../components/admin/DataTable';
import StatusBadge from '../../components/admin/StatusBadge';
import ActionButton from '../../components/admin/ActionButton';
import Modal from '../../components/admin/Modal';
import { Edit2, Eye, EyeOff, Plus } from 'lucide-react';
import { useRouteManagerController } from '../../controllers/admin/useRouteManagerController';
import { Route } from '../../models/admin/AdminTypes';

export default function RouteManager() {
    // Controller: Handles logic and state
    const {
        routes,
        searchTerm,
        setSearchTerm,
        isModalOpen,
        selectedRoute,
        handleEdit,
        handleAddNew,
        toggleStatus,
        closeModal
    } = useRouteManagerController();

    const columns = [
        { header: 'Route ID', accessor: 'route_num' as const, className: 'font-bold text-gray-900 w-24' },
        { header: 'Route Name', accessor: 'route_name' as const },
        {
            header: 'Status',
            accessor: (row: Route) => <StatusBadge status={row.status} />
        },
        { header: 'Total Stops', accessor: 'stops_count' as const, className: 'text-center' },
        { header: 'Last Updated', accessor: 'last_updated' as const, className: 'text-gray-500' },
        {
            header: 'Actions',
            accessor: (row: Route) => (
                <div className="flex items-center gap-2">
                    <ActionButton
                        icon={Edit2}
                        onClick={() => handleEdit(row)}
                        title="Edit Route"
                    />
                    <ActionButton
                        icon={row.status === 'Active' ? Eye : EyeOff}
                        variant={row.status === 'Active' ? 'secondary' : 'ghost'}
                        onClick={() => toggleStatus(row.id)}
                        title={row.status === 'Active' ? 'Hide Route' : 'Show Route'}
                        className={row.status === 'Hidden' ? 'text-gray-400' : ''}
                    />
                </div>
            )
        }
    ];

    // View: Renders the UI with data from the controller
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Route Management</h1>
                    <p className="text-gray-500">Manage bus routes, stops, and schedules.</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                >
                    <Plus size={20} />
                    <span>Add New Route</span>
                </button>
            </div>

            <DataTable
                columns={columns}
                data={routes}
                onSearch={setSearchTerm}
                pagination={{
                    currentPage: 1,
                    totalPages: 5,
                    onPageChange: (p) => console.log(p)
                }}
            />

            {/* Edit/Add Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={selectedRoute ? `Edit Route #${selectedRoute.route_num}` : 'Add New Route'}
                footer={
                    <>
                        <button onClick={closeModal} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
                    </>
                }
            >
                <div className="space-y-4">
                    {/* Mock Form */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Route Number</label>
                            <input type="number" defaultValue={selectedRoute?.route_num} className="w-full p-2 border rounded-lg" />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select defaultValue={selectedRoute?.status || 'Active'} className="w-full p-2 border rounded-lg">
                                <option>Active</option>
                                <option>Hidden</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Route Name</label>
                            <input type="text" defaultValue={selectedRoute?.route_name} className="w-full p-2 border rounded-lg" />
                        </div>
                        <div className="col-span-2 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center text-gray-500">
                            Map Visualization Placeholder
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
