/**
 * UserManager.tsx — GoTransit Regina  [VIEW — MVC]
 *
 * Shows real registered users from Supabase profiles.
 * Columns: Full Name · Email · Role · Status · Registered · Last Active · Actions
 * Actions: Edit (modal) · Ban (suspend) · Delete (soft)
 */

import React from 'react';
import { Edit2, Trash2, Ban, Download, Search, X, AlertCircle } from 'lucide-react';
import { useUserManagerController } from '../../controllers/admin/useUserManagerController';
import { User } from '../../models/admin/AdminTypes';

/* ── Sub-components ──────────────────────────────────────────────── */

function RoleBadge({ role }: { role: string }) {
    const isAdmin = role === 'admin';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
            isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
        }`}>
            {isAdmin ? 'Admin' : 'User'}
        </span>
    );
}

function StatusDot({ status }: { status: string }) {
    const active = status === 'Active';
    return (
        <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-red-400'}`} />
            <span className={`text-xs font-medium ${active ? 'text-green-700' : 'text-red-600'}`}>
                {status}
            </span>
        </div>
    );
}

/* ── Main View ───────────────────────────────────────────────────── */

export default function UserManager() {
    const {
        users, isLoading,
        searchTerm, setSearchTerm,
        actionError,
        editTarget, editFields, setEditFields, editLoading,
        openEdit, closeEdit, saveEdit,
        banUser, deleteUser,
    } = useUserManagerController();

    /* ── CSV Export ──────────────────────────────────────────────── */
    const handleExportCsv = () => {
        const headers = ['Name', 'Email', 'Role', 'Status', 'Registered', 'Last Active'];
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

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500">
                        {isLoading ? 'Loading…' : `${users.length} user${users.length !== 1 ? 's' : ''} registered`}
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

            {/* Action error banner */}
            {actionError && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <div>
                        <span className="font-semibold">Action failed: </span>{actionError}
                        <p className="text-red-500 text-xs mt-1">
                            You may need to add admin RLS policies in Supabase — see comments in UserRegistry.ts.
                        </p>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="relative max-w-xs">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email…"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="py-16 text-center text-gray-400 text-sm">Loading users…</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 text-left border-b border-gray-100">
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Registered</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Active</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map((user: User) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        {/* Full Name + avatar */}
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-900 text-sm">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-sm text-gray-600">{user.email || '—'}</td>
                                        <td className="px-6 py-3"><RoleBadge role={user.role} /></td>
                                        <td className="px-6 py-3"><StatusDot status={user.status} /></td>
                                        <td className="px-6 py-3 text-sm text-gray-500">{user.registered}</td>
                                        <td className="px-6 py-3 text-sm text-gray-500">{user.last_login}</td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                {/* Edit */}
                                                <button
                                                    onClick={() => openEdit(user)}
                                                    title="Edit user details"
                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                                                >
                                                    <Edit2 size={12} /> Edit
                                                </button>
                                                {/* Ban */}
                                                <button
                                                    onClick={() => banUser(user)}
                                                    title="Suspend user"
                                                    disabled={user.status === 'Suspended'}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <Ban size={12} /> Ban
                                                </button>
                                                {/* Delete */}
                                                <button
                                                    onClick={() => deleteUser(user)}
                                                    title="Soft-delete user"
                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                                                >
                                                    <Trash2 size={12} /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                                            No users match your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeEdit} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
                        {/* Modal header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Edit User</h3>
                            <button onClick={closeEdit} className="p-1 rounded-lg hover:bg-gray-100 transition">
                                <X size={18} className="text-gray-500" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">{editTarget.email || editTarget.name}</p>

                        {/* Full Name */}
                        <label className="block mb-3">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</span>
                            <input
                                type="text"
                                value={editFields.full_name}
                                onChange={e => setEditFields(f => ({ ...f, full_name: e.target.value }))}
                                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                            />
                        </label>

                        {/* Role */}
                        <label className="block mb-3">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</span>
                            <select
                                value={editFields.role}
                                onChange={e => setEditFields(f => ({ ...f, role: e.target.value }))}
                                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-white"
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </label>

                        {/* Account Status */}
                        <label className="block mb-5">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Status</span>
                            <select
                                value={editFields.account_status}
                                onChange={e => setEditFields(f => ({ ...f, account_status: e.target.value }))}
                                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-white"
                            >
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </label>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={closeEdit}
                                disabled={editLoading}
                                className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveEdit}
                                disabled={editLoading}
                                className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {editLoading ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
