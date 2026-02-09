import React from 'react';
import DataTable from '../../components/admin/DataTable';
import StatusBadge from '../../components/admin/StatusBadge';
import ActionButton from '../../components/admin/ActionButton';
import { Edit2, Trash2, Shield, Eye } from 'lucide-react';
import { useUserManagerController } from '../../controllers/admin/useUserManagerController';
import { User } from '../../models/admin/AdminTypes';

export default function UserManager() {
    // Controller: Handles logic and state
    const { users, searchTerm, setSearchTerm } = useUserManagerController();

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        {
            header: 'User',
            accessor: (row: User) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {row.name.charAt(0)}
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{row.name}</div>
                        <div className="text-xs text-gray-500">{row.email}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Role',
            accessor: (row: User) => (
                <div className="flex items-center gap-1 text-gray-600">
                    <Shield size={14} />
                    <span>{row.role}</span>
                </div>
            )
        },
        {
            header: 'Status',
            accessor: (row: any) => <StatusBadge status={row.status} />
        },
        { header: 'Registered', accessor: 'registered' as const },
        { header: 'Last Login', accessor: 'last_login' as const },
        {
            header: 'Actions',
            accessor: (row: any) => (
                <div className="flex items-center gap-2">
                    <ActionButton icon={Eye} variant="ghost" title="View Details" />
                    <ActionButton icon={Edit2} variant="secondary" title="Edit User" />
                    <ActionButton icon={Trash2} variant="danger" title="Delete User" />
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500">Manage registered travelers and admins.</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Export CSV
                </button>
            </div>

            <DataTable
                columns={columns}
                data={users}
                onSearch={setSearchTerm}
                pagination={{
                    currentPage: 1,
                    totalPages: 10,
                    onPageChange: (p) => console.log(p)
                }}
            />
        </div>
    );
}
