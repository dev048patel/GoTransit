/**
 * ActivityLog.tsx — Transit Regina  [VIEW — MVC]
 * Who did what, and when: every admin action, newest first.
 */
import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../../models/lib/apiClient';
import { Badge, Card, EVENT_LABEL, PageHeader, when } from '../components/admin/ui';

interface Entry { type: string; severity: 'info' | 'warning' | 'critical'; message: string; admin: string; ip: string | null; created_at: string; }
const ACTIONS = ['user_deleted', 'role_changed', 'status_changed', 'user_updated', 'feature_access_changed', 'route_changed', 'sms_broadcast', 'sms_outage_declared', 'sms_settings_changed', 'personal_data_viewed', 'events_handled'];

export default function ActivityLog() {
    const [rows, setRows] = useState<Entry[] | null>(null);
    const [error, setError] = useState('');
    const [q, setQ] = useState('');
    const [kind, setKind] = useState('all');
    useEffect(() => { apiGet('/api/admin/activity').then(r => r.json()).then(setRows).catch(e => setError(e.message)); }, []);

    const shown = useMemo(() => (rows ?? []).filter(r => (kind === 'all' || r.type === kind) && (!q || `${r.message} ${r.admin}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, kind]);

    return (
        <div>
            <PageHeader title="Activity log" subtitle="Every action taken by an admin. Kept for 90 days." />
            {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">Could not load the log: {error}</p>}
            <div className="flex flex-wrap gap-3 mb-4">
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by admin, email or text" aria-label="Search the activity log"
                    className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30" />
                <select value={kind} onChange={e => setKind(e.target.value)} aria-label="Kind of action" className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                    <option value="all">All actions</option>
                    {ACTIONS.map(k => <option key={k} value={k}>{EVENT_LABEL[k]}</option>)}
                </select>
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-xs text-slate-500 bg-slate-50"><tr><th className="px-5 py-2.5">When</th><th className="px-5 py-2.5">Admin</th><th className="px-5 py-2.5">Action</th><th className="px-5 py-2.5">Details</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {shown.map((r, i) => (
                                <tr key={r.created_at + i}>
                                    <td className="px-5 py-3 whitespace-nowrap text-slate-600">{when(r.created_at)}</td>
                                    <td className="px-5 py-3 whitespace-nowrap font-medium text-slate-900">{r.admin}</td>
                                    <td className="px-5 py-3 whitespace-nowrap"><Badge tone={r.severity === 'critical' ? 'bad' : r.severity === 'warning' ? 'warn' : 'neutral'}>{EVENT_LABEL[r.type] ?? r.type}</Badge></td>
                                    <td className="px-5 py-3 text-slate-700 break-words">{r.message}</td>
                                </tr>
                            ))}
                            {rows && shown.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">Nothing to show.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
