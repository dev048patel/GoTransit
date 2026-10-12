/**
 * People.tsx — Transit Regina  [VIEW — MVC]
 * Find a person. Clicking a row opens everything about them on one page.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getAllUsers } from '../../models/services/UserRegistry';
import type { User } from '../../models/admin/AdminTypes';
import { Badge, Card, PageHeader, btn } from '../components/admin/ui';

const FILTERS = ['All', 'Online', 'Admins', 'Suspended'] as const;

export default function People() {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[] | null>(null);
    const [q, setQ] = useState('');
    const [filter, setFilter] = useState<typeof FILTERS[number]>('All');
    useEffect(() => { getAllUsers().then(setUsers); }, []);

    const shown = useMemo(() => (users ?? []).filter(u =>
        (filter === 'All' || (filter === 'Online' && u.isOnline) || (filter === 'Admins' && u.role === 'admin') || (filter === 'Suspended' && u.status !== 'Active'))
        && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()))), [users, q, filter]);
    const count = (f: typeof FILTERS[number]) => (users ?? []).filter(u => f === 'All' || (f === 'Online' && u.isOnline) || (f === 'Admins' && u.role === 'admin') || (f === 'Suspended' && u.status !== 'Active')).length;

    return (
        <div>
            <PageHeader title="People" subtitle={users ? `${users.length} accounts` : 'Loading…'}
                actions={<Link to="/admin/people/features" className={btn.plain}>Change a feature for everyone</Link>} />
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[220px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or email" aria-label="Search people"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30" />
                </div>
                {FILTERS.map(f => (
                    <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
                        className={'px-3 py-1.5 rounded-full text-xs font-semibold ' + (filter === f ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
                        {f} <span className="opacity-70">{count(f)}</span>
                    </button>
                ))}
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-xs text-slate-500 bg-slate-50"><tr><th className="px-5 py-2.5">Person</th><th className="px-5 py-2.5">Role</th><th className="px-5 py-2.5">Status</th><th className="px-5 py-2.5">Joined</th><th className="px-5 py-2.5">Last active</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {shown.map(u => (
                                <tr key={u.id} onClick={() => navigate(`/admin/people/${u.id}`)} className="cursor-pointer hover:bg-slate-50">
                                    <td className="px-5 py-3">
                                        <Link to={`/admin/people/${u.id}`} onClick={e => e.stopPropagation()} className="font-medium text-slate-900 hover:underline">{u.name}</Link>
                                        <div className="text-xs text-slate-500">{u.email}</div>
                                    </td>
                                    <td className="px-5 py-3"><Badge tone={u.role === 'admin' ? 'info' : 'neutral'}>{u.role}</Badge></td>
                                    <td className="px-5 py-3"><Badge tone={u.status === 'Active' ? 'good' : 'bad'}>{u.status}</Badge></td>
                                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{u.registered}</td>
                                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{u.isOnline ? <span className="text-emerald-700 font-medium">● Online now</span> : u.last_active}</td>
                                </tr>
                            ))}
                            {users && shown.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No one matches.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
