/**
 * SecurityCenter.tsx — Transit Regina  [VIEW — MVC]
 * Admin page: is everything the site depends on working, and has anything unusual happened?
 */
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { useSecurityController } from '../../controllers/admin/useSecurityController';

const SEVERITY: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    warning: 'bg-amber-100 text-amber-800',
    info: 'bg-gray-100 text-gray-700',
};
const when = (iso: string) => new Date(iso).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function SecurityCenter() {
    const { data, error, events, filter, setFilter, reload, counts, showHandled, setShowHandled, markHandled } = useSecurityController();
    const open = events.filter(e => e.id && !e.handledAt).map(e => e.id!);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Security</h1>
                    <p className="text-gray-500 mt-1">System health and anything unusual, refreshed every 30 seconds.</p>
                </div>
                <button onClick={reload} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">Could not load security data: {error}</p>}

            {/* Health */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(data?.health.checks ?? []).map(c => (
                    <div key={c.name} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                            {c.ok ? <CheckCircle2 size={16} className="text-green-600" /> : <XCircle size={16} className="text-red-600" />} {c.name}
                        </div>
                        <div className={'text-xl font-bold mt-1 ' + (c.ok ? 'text-gray-900' : 'text-red-700')}>{c.ok ? 'Working' : 'Down'}</div>
                        <div className="text-xs text-gray-500 mt-1">{c.detail} · since {when(c.since)}</div>
                    </div>
                ))}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-500">Critical, last 24 h</div>
                    <div className={'text-xl font-bold mt-1 ' + (counts.critical ? 'text-red-700' : 'text-gray-900')}>{counts.critical}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-500">Warnings, last 24 h</div>
                    <div className={'text-xl font-bold mt-1 ' + (counts.warning ? 'text-amber-700' : 'text-gray-900')}>{counts.warning}</div>
                </div>
            </div>

            {/* Things that are set up wrong */}
            {(data?.health.config ?? []).map(msg => (
                <p key={msg} className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    <AlertTriangle size={16} className="mt-0.5 flex-none" /> {msg}
                </p>
            ))}
            {data && !data.stored && (
                <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                    Showing events since the backend last restarted. Run the database script in docs/security to keep the full history.
                </p>
            )}

            {/* Events */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                    <ShieldAlert size={18} className="text-gray-500" />
                    <h2 className="font-semibold text-gray-900 flex-1">Events</h2>
                    {data?.canHandle && <>
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 mr-2">
                            <input type="checkbox" checked={showHandled} onChange={e => setShowHandled(e.target.checked)} /> Show handled
                        </label>
                        <button onClick={() => markHandled(open)} disabled={!open.length}
                            className="px-3 py-1 rounded-full text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 mr-2">
                            Mark all shown as handled
                        </button>
                    </>}
                    {(['all', 'warning', 'critical'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
                            className={'px-3 py-1 rounded-full text-xs font-semibold ' + (filter === f ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                            {f === 'all' ? 'All' : f === 'warning' ? 'Warnings and above' : 'Critical only'}
                        </button>
                    ))}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-xs text-gray-500 uppercase bg-gray-50">
                            <tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Level</th><th className="px-4 py-2">What happened</th><th className="px-4 py-2">Address</th><th className="px-4 py-2">Path</th><th className="px-4 py-2" /></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {events.map((e, i) => (
                                <tr key={e.at + i} className={e.handledAt ? 'opacity-50' : ''}>
                                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">{when(e.at)}</td>
                                    <td className="px-4 py-2"><span className={'px-2 py-0.5 rounded-full text-xs font-semibold ' + SEVERITY[e.severity]}>{e.severity}</span></td>
                                    <td className="px-4 py-2 text-gray-900">{e.message}<div className="text-xs text-gray-400">{e.type}</div></td>
                                    <td className="px-4 py-2 text-gray-600 font-mono text-xs">{e.ip ?? '—'}</td>
                                    <td className="px-4 py-2 text-gray-600 font-mono text-xs break-all">{e.path ?? '—'}</td>
                                    <td className="px-4 py-2 text-right whitespace-nowrap text-xs">
                                        {e.handledAt ? <span className="text-gray-500">Handled {when(e.handledAt)}</span>
                                            : data?.canHandle && e.id ? <button onClick={() => markHandled([e.id!])} className="font-semibold text-[#003DA5] hover:underline">Mark handled</button> : null}
                                    </td>
                                </tr>
                            ))}
                            {data && events.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Nothing to show.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
