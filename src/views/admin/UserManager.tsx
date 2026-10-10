import { Edit2, Trash2, Ban, Download, Search, X } from 'lucide-react';
import { useUserManagerController } from '../../controllers/admin/useUserManagerController';
import { User } from '../../models/admin/AdminTypes';

function RoleBadge({ role }: { role: string }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            role === 'admin' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
        }`}>
            {role === 'admin' ? 'Admin' : 'User'}
        </span>
    );
}

function StatusDot({ status }: { status: string }) {
    const active = status === 'Active';
    return (
        <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-slate-400'}`} />
            <span className="text-xs text-slate-600">{status}</span>
        </div>
    );
}

export default function UserManager() {
    const {
        users, isLoading,
        searchTerm, setSearchTerm,
        editTarget, editFields, setEditFields, editLoading,
        openEdit, closeEdit, saveEdit,
        banUser, deleteUser,
    } = useUserManagerController();

    const handleExportCsv = () => {
        const headers = ['Name', 'Email', 'Role', 'Status', 'Registered', 'Last Active'];
        const rows = users.map(u => [u.name, u.email, u.role, u.status, u.registered, u.last_active]);
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">User Management</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {isLoading ? 'Loading…' : `${users.length} user${users.length !== 1 ? 's' : ''}`}
                    </p>
                </div>
                <button
                    onClick={handleExportCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition text-xs font-medium"
                >
                    <Download size={13} /> Export CSV
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-xs">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by name or email…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                {isLoading ? (
                    <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Name</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Email</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Role</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Status</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Registered</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Last Active</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {users.map((user: User) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-semibold text-xs shrink-0">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm text-slate-800">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-slate-500">{user.email || '—'}</td>
                                        <td className="px-4 py-2.5"><RoleBadge role={user.role} /></td>
                                        <td className="px-4 py-2.5"><StatusDot status={user.status} /></td>
                                        <td className="px-4 py-2.5 text-xs text-slate-500">{user.registered}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-slate-300'}`} />
                                                <span className="text-xs text-slate-500">
                                                    {user.isOnline ? 'Online' : user.last_active}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => openEdit(user)}
                                                    title="Edit"
                                                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition"
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    onClick={() => banUser(user)}
                                                    title="Suspend"
                                                    disabled={user.status === 'Suspended'}
                                                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <Ban size={13} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Delete ${user.name}? This is permanent.`)) deleteUser(user);
                                                    }}
                                                    title="Delete"
                                                    className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-500 rounded transition"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
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
                    <div className="absolute inset-0 bg-black/30" onClick={closeEdit} />
                    <div className="relative bg-white rounded-xl shadow-lg w-full max-w-sm p-5 z-10">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-900">Edit User</h3>
                            <button onClick={closeEdit} className="p-1 rounded hover:bg-slate-100 transition">
                                <X size={16} className="text-slate-400" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">{editTarget.email || editTarget.name}</p>

                        <label className="block mb-3">
                            <span className="text-xs font-medium text-slate-500">Full Name</span>
                            <input
                                type="text"
                                value={editFields.full_name}
                                onChange={e => setEditFields(f => ({ ...f, full_name: e.target.value }))}
                                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                            />
                        </label>

                        <label className="block mb-3">
                            <span className="text-xs font-medium text-slate-500">Role</span>
                            <select
                                value={editFields.role}
                                onChange={e => setEditFields(f => ({ ...f, role: e.target.value }))}
                                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white"
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </label>

                        <label className="block mb-4">
                            <span className="text-xs font-medium text-slate-500">Status</span>
                            <select
                                value={editFields.account_status}
                                onChange={e => setEditFields(f => ({ ...f, account_status: e.target.value }))}
                                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white"
                            >
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </label>

                        <div className="flex gap-2">
                            <button
                                onClick={closeEdit}
                                disabled={editLoading}
                                className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveEdit}
                                disabled={editLoading}
                                className="flex-1 py-2 rounded-lg bg-slate-700 text-white text-xs font-medium hover:bg-slate-600 transition disabled:opacity-50"
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
