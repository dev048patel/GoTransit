/**
 * UserManager.tsx — GoTransit Regina  [VIEW — MVC]
 *
 * Displays real registered users (from UserRegistry/localStorage) at the top,
 * followed by mock historical users. Real users are badged with a green "New" tag.
 *
 * Features:
 *  - Live polls localStorage every 2s (via controller) — new signups appear automatically
 *  - "Export CSV" downloads ALL users as a .csv file
 *  - Search filters by name or email
 */

import React from 'react';
import DataTable from '../../components/admin/DataTable';
import StatusBadge from '../../components/admin/StatusBadge';
import ActionButton from '../../components/admin/ActionButton';
import { Edit2, Trash2, Shield, Eye, Download, UserPlus } from 'lucide-react';
import { useUserManagerController } from '../../controllers/admin/useUserManagerController';
import { User } from '../../models/admin/AdminTypes';

export default function UserManager() {
    const { users, realUserCount, searchTerm, setSearchTerm } = useUserManagerController();

    /* ── CSV Export ─────────────────────────────────────────────────── */
    const handleExportCsv = () => {
        const headers = ['Name', 'Email', 'Role', 'Status', 'Registered', 'Last Login'];
        const rows = users.map(u => [u.name, u.email, u.role, u.status, u.registered, u.last_login]);
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gotransit_users_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    /* ── Table columns ──────────────────────────────────────────────── */
    const columns = [
        {
            header: 'User',
            accessor: (row: User) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {row.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{row.name}</span>
                            {/* "New" badge for real rregistered users (IDs start with 'usr-1' from Date.now()) */}
                            {row.id.startsWith('usr-1') && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-700">NEW</span>
                            )}
                        </div>
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
            accessor: (row: User) => <StatusBadge status={row.status} />
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
                    <p className="text-gray-500">
                        Manage registered travelers and admins.
                        {realUserCount > 0 && (
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                <UserPlus size={11} />
                                {realUserCount} real signup{realUserCount !== 1 ? 's' : ''}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={handleExportCsv}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                    <Download size={15} />
                    Export CSV
                </button>
            </div>

            <DataTable
                columns={columns}
                data={users}
                onSearch={setSearchTerm}
                pagination={{
                    currentPage: 1,
                    totalPages: Math.ceil(users.length / 10),
                    onPageChange: (p) => console.log('[GoTransit] Admin pagination → page', p)
                }}
            />
        </div>
    );
}
