import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, RefreshCw, CheckCircle } from 'lucide-react';
import { useFeatureAccessController, GlobalFeatureState } from '../../controllers/admin/useFeatureAccessController';
import { FEATURES, FeatureKey } from '../../models/admin/FeatureAccessTypes';

interface ToggleProps {
    enabled: boolean;
    onChange: () => void;
    disabled?: boolean;
    mixed?: boolean;
}
function Toggle({ enabled, onChange, disabled, mixed }: ToggleProps) {
    const bg = mixed ? 'bg-amber-400' : enabled ? 'bg-slate-600' : 'bg-slate-200';
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={disabled}
            onClick={onChange}
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${bg} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span className={`h-3 w-3 transform rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
        </button>
    );
}

export default function FeatureAccessControl() {
    const [searchParams, setSearchParams] = useSearchParams();
    const ctrl = useFeatureAccessController();

    React.useEffect(() => {
        const q = searchParams.get('search');
        if (q) { ctrl.setSearch(q); setSearchParams({}, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (ctrl.loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <RefreshCw size={20} className="text-slate-400 animate-spin" />
            </div>
        );
    }

    if (ctrl.error) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                <p className="text-slate-600 text-sm">{ctrl.error}</p>
                <button onClick={ctrl.refresh} className="mt-2 px-3 py-1.5 bg-slate-700 text-white rounded text-xs">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">Feature Access</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {ctrl.stats.total} users · {ctrl.stats.restricted} restricted · {ctrl.stats.total - ctrl.stats.restricted} full access
                    </p>
                </div>
                <button
                    onClick={ctrl.refresh}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition text-xs font-medium"
                >
                    <RefreshCw size={13} /> Refresh
                </button>
            </div>

            {/* Global switches */}
            <div className="bg-white rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Global Switches</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {FEATURES.map(f => {
                        const gState: GlobalFeatureState = ctrl.globalFeatureState[f.key];
                        const isOn = gState === 'on';
                        const isMixed = gState === 'mixed';
                        const savingAll = ctrl.saving === `all:${f.key}`;
                        return (
                            <div key={f.key} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50">
                                <div className="min-w-0 mr-2">
                                    <p className="text-xs font-medium text-slate-700 truncate">{f.label}</p>
                                    <p className="text-xs text-slate-400">{isOn ? 'All on' : isMixed ? 'Mixed' : 'All off'}</p>
                                </div>
                                {savingAll
                                    ? <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin flex-shrink-0" />
                                    : <Toggle enabled={isOn} mixed={isMixed} onChange={() => ctrl.handleToggleAll(f.key, !isOn)} disabled={savingAll} />
                                }
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Per-user table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-700">
                        Per-User Access
                        <span className="ml-1.5 text-xs font-normal text-slate-400">
                            ({ctrl.filteredUsers.length}{ctrl.search ? ` of ${ctrl.stats.total}` : ''})
                        </span>
                    </p>
                    <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search…"
                            value={ctrl.search}
                            onChange={e => ctrl.setSearch(e.target.value)}
                            className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-300 w-44"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">User</th>
                                {FEATURES.map(f => (
                                    <th key={f.key} className="px-3 py-2 text-center text-xs font-medium text-slate-500 min-w-[90px]">
                                        {f.label}
                                    </th>
                                ))}
                                <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">Reset</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {ctrl.filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={FEATURES.length + 2} className="px-4 py-8 text-center text-slate-400 text-sm">
                                        {ctrl.search ? 'No users match.' : 'No users found.'}
                                    </td>
                                </tr>
                            ) : (
                                ctrl.filteredUsers.map(u => {
                                    const hasAnyRestriction = Object.values(u.access).some(v => !v);
                                    return (
                                        <tr key={u.userId} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-semibold flex-shrink-0">
                                                        {(u.fullName ?? u.email)[0].toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        {u.fullName && <p className="text-xs font-medium text-slate-800 truncate">{u.fullName}</p>}
                                                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {FEATURES.map(f => {
                                                const enabled = u.access[f.key as FeatureKey];
                                                const savingThis = ctrl.saving === `${u.userId}:${f.key}`;
                                                return (
                                                    <td key={f.key} className="px-3 py-2.5 text-center">
                                                        {savingThis
                                                            ? <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin mx-auto" />
                                                            : <Toggle enabled={enabled} onChange={() => ctrl.handleToggle(u.userId, f.key as FeatureKey, !enabled)} />
                                                        }
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-2.5 text-center">
                                                {hasAnyRestriction ? (
                                                    <button
                                                        disabled={ctrl.saving === `reset:${u.userId}`}
                                                        onClick={() => ctrl.handleReset(u.userId)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition disabled:opacity-50"
                                                    >
                                                        {ctrl.saving === `reset:${u.userId}`
                                                            ? <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                                                            : <CheckCircle size={11} />
                                                        }
                                                        Restore
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-300">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-xs text-slate-400 pb-1">Changes take effect on user's next page load · Amber = mixed</p>
        </div>
    );
}
