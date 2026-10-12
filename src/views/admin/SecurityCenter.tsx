/**
 * SecurityCenter.tsx — Transit Regina  [VIEW — MVC]
 * Admin page: is everything the site depends on working, and has anything unusual happened?
 */
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { useSecurityController } from '../../controllers/admin/useSecurityController';
import { Badge, Card, EVENT_LABEL, PageHeader, Stat, btn, when } from '../components/admin/ui';

/** What each kind of event usually means, so an admin can tell noise from a problem. */
const ADVICE: Record<string, string> = {
    auth_failed: 'Usually a bot or an expired login. Worth a look only if one address keeps doing it.',
    admin_denied: 'A signed-in rider called an admin endpoint. Check who it was.',
    admin_two_step_missing: 'An admin password was used without the authenticator code. If that was not you, change the password.',
    rate_limited: 'One address sent far more requests than a rider would.',
    validation_failed: 'A request did not look like one the app sends. Often a scanner.',
    cors_blocked: 'Another website tried to use the backend and was refused.',
    webhook_rejected: 'Something pretended to be the text-message provider and was refused.',
    burst: 'The same thing was blocked ten times in ten minutes from one address. Someone is probing.',
    dependency_down: 'Riders are affected until this recovers.',
    server_error: 'The backend hit an unexpected error. Check the Railway logs.',
    role_changed_db: 'A role was changed outside the admin panel. Confirm an admin did this.',
};
const TONE = { critical: 'bad', warning: 'warn', info: 'neutral' } as const;

export default function SecurityCenter() {
    const { data, error, groups, filter, setFilter, reload, counts, showHandled, setShowHandled, markHandled } = useSecurityController();
    const open = groups.filter(g => !g.handledAt).flatMap(g => g.ids);

    return (
        <div>
            <PageHeader title="Security" subtitle="System health and anything unusual. Refreshed every 30 seconds."
                actions={<button onClick={reload} className={btn.plain}><RefreshCw size={16} /> Refresh</button>} />

            {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">Could not load security data: {error}</p>}

            {/* Health */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {(data?.health.checks ?? []).map(c => (
                    <Stat key={c.name} label={c.name}
                        value={<span className={'inline-flex items-center gap-2 text-xl ' + (c.ok ? 'text-emerald-700' : 'text-red-700')}>{c.ok ? <CheckCircle2 size={20} /> : <XCircle size={20} />}{c.ok ? 'Working' : 'Down'}</span>}
                        sub={`${c.detail} · since ${when(c.since)}`} />
                ))}
                <Stat label="Critical, last 24 h" value={<span className={counts.critical ? 'text-red-700' : ''}>{counts.critical}</span>} sub="not yet handled" />
                <Stat label="Warnings, last 24 h" value={<span className={counts.warning ? 'text-amber-700' : ''}>{counts.warning}</span>} sub="not yet handled" />
            </div>

            {/* Things that are set up wrong */}
            {(data?.health.config ?? []).map(msg => (
                <p key={msg} className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
                    <AlertTriangle size={16} className="mt-0.5 flex-none" /> {msg}
                </p>
            ))}
            {data && !data.stored && (
                <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-4">
                    Showing events since the backend last restarted. Run the database script in docs/security to keep the full history.
                </p>
            )}

            <Card title="Events" action={
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {data?.canHandle && <>
                        <label className="flex items-center gap-1.5 text-xs text-slate-600">
                            <input type="checkbox" checked={showHandled} onChange={e => setShowHandled(e.target.checked)} /> Show handled
                        </label>
                        <button onClick={() => markHandled(open)} disabled={!open.length} className="px-3 py-1 rounded-full text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                            Mark all shown as handled
                        </button>
                    </>}
                    {(['warning', 'critical', 'all'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
                            className={'px-3 py-1 rounded-full text-xs font-semibold ' + (filter === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                            {f === 'all' ? 'Everything' : f === 'warning' ? 'Needs a look' : 'Critical only'}
                        </button>
                    ))}
                </div>
            }>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-xs text-slate-500 bg-slate-50">
                            <tr><th className="px-5 py-2.5">Last seen</th><th className="px-5 py-2.5">What happened</th><th className="px-5 py-2.5">Who</th><th className="px-5 py-2.5">Where</th><th className="px-5 py-2.5" /></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {groups.map((g, i) => (
                                <tr key={g.at + i} className={g.handledAt ? 'opacity-50' : ''}>
                                    <td className="px-5 py-3 whitespace-nowrap text-slate-600 align-top">{when(g.at)}</td>
                                    <td className="px-5 py-3 align-top">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge tone={TONE[g.severity]}>{EVENT_LABEL[g.type] ?? g.type}</Badge>
                                            {g.count > 1 && <span className="text-xs font-semibold text-slate-500">{g.count} times</span>}
                                        </div>
                                        <div className="text-slate-900 mt-1 break-words">{g.message}</div>
                                        {ADVICE[g.type] && <div className="text-xs text-slate-500 mt-0.5">{ADVICE[g.type]}</div>}
                                    </td>
                                    <td className="px-5 py-3 align-top">
                                        <div className="text-slate-900">{g.who ?? 'Not signed in'}</div>
                                        <div className="text-xs text-slate-500 font-mono">{g.ip ?? ''}</div>
                                    </td>
                                    <td className="px-5 py-3 align-top text-xs text-slate-600 font-mono break-all">
                                        {g.paths.slice(0, 3).map(p => <div key={p}>{p}</div>)}
                                        {g.paths.length > 3 && <div className="font-sans text-slate-500">and {g.paths.length - 3} more</div>}
                                    </td>
                                    <td className="px-5 py-3 align-top text-right whitespace-nowrap text-xs">
                                        {g.handledAt ? <span className="text-slate-500">Handled {when(g.handledAt)}</span>
                                            : data?.canHandle && g.ids.length && g.severity !== 'info' ? <button onClick={() => markHandled(g.ids)} className="font-semibold text-[#003DA5] hover:underline">Mark handled</button> : null}
                                    </td>
                                </tr>
                            ))}
                            {data && groups.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">{filter === 'all' ? 'Nothing to show.' : 'Nothing needs a look.'}</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
