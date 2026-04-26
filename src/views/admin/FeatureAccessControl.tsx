/*
  Feature Access Control (FAC) Admin Page
  - Global on/off switch per feature column (affects all users)
  - Individual on/off switch per user per feature
*/
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Search, RefreshCw, Users, Lock, CheckCircle } from 'lucide-react';
import { useFeatureAccessController, GlobalFeatureState } from '../../controllers/admin/useFeatureAccessController';
import { FEATURES, FeatureKey } from '../../models/admin/FeatureAccessTypes';

/* ── colour map ─────────────────────────────────────────────────────── */
const C: Record<FeatureKey, { track: string; trackOff: string; label: string }> = {
    weekly_planner:     { track: 'bg-green-500',  trackOff: 'bg-gray-300', label: 'text-green-700' },
    trip_planner:       { track: 'bg-blue-500',   trackOff: 'bg-gray-300', label: 'text-blue-700'  },
    saved_locations:    { track: 'bg-purple-500', trackOff: 'bg-gray-300', label: 'text-purple-700'},
    bus_suggestions:    { track: 'bg-yellow-500', trackOff: 'bg-gray-300', label: 'text-yellow-700'},
    push_notifications: { track: 'bg-red-500',    trackOff: 'bg-gray-300', label: 'text-red-700'   },
};

/* ── reusable toggle switch ─────────────────────────────────────────── */
interface ToggleProps {
    enabled: boolean;
    onChange: () => void;
    disabled?: boolean;
    size?: 'sm' | 'md';
    trackColor: string;
    mixed?: boolean; // indeterminate — shown as amber
}
function Toggle({ enabled, onChange, disabled, size = 'md', trackColor, mixed }: ToggleProps) {
    const h = size === 'sm' ? 'h-4' : 'h-5';
    const w = size === 'sm' ? 'w-7' : 'w-9';
    const dot = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
    const translate = size === 'sm'
        ? (enabled ? 'translate-x-3.5' : 'translate-x-0.5')
        : (enabled ? 'translate-x-4'   : 'translate-x-0.5');

    const bg = mixed ? 'bg-amber-400' : enabled ? trackColor : 'bg-gray-300';

    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={disabled}
            onClick={onChange}
            className={`relative inline-flex ${h} ${w} items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400 ${bg} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span
                className={`${dot} transform rounded-full bg-white shadow transition-transform duration-200 ${translate} ${disabled ? '' : ''}`}
            />
        </button>
    );
}

/* ── main page ──────────────────────────────────────────────────────── */
export default function FeatureAccessControl() {
    const [searchParams, setSearchParams] = useSearchParams();
    const ctrl = useFeatureAccessController();

    // Pre-fill search from VisitorAnalytics "Manage Access" deep-link
    React.useEffect(() => {
        const q = searchParams.get('search');
        if (q) { ctrl.setSearch(q); setSearchParams({}, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (ctrl.loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <RefreshCw size={40} className="mx-auto text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-500">Loading access data…</p>
                </div>
            </div>
        );
    }

    if (ctrl.error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-600 font-medium">{ctrl.error}</p>
                <button onClick={ctrl.refresh} className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Shield size={28} className="text-slate-600" />
                        Feature Access Control
                    </h1>
                    <p className="text-gray-500 mt-1">Toggle features per user or for everyone at once</p>
                </div>
                <button
                    onClick={ctrl.refresh}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition shadow-sm"
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg"><Users size={22} className="text-blue-500" /></div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{ctrl.stats.total}</p>
                        <p className="text-sm text-gray-500">Total Users</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-yellow-50 rounded-lg"><Lock size={22} className="text-yellow-500" /></div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{ctrl.stats.restricted}</p>
                        <p className="text-sm text-gray-500">Have Restrictions</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-lg"><CheckCircle size={22} className="text-green-500" /></div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{ctrl.stats.total - ctrl.stats.restricted}</p>
                        <p className="text-sm text-gray-500">Full Access</p>
                    </div>
                </div>
            </div>

            {/* Global feature switches */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Global Switches — toggle a feature for <span className="text-gray-900">all users</span> at once
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {FEATURES.map(f => {
                        const gState: GlobalFeatureState = ctrl.globalFeatureState[f.key];
                        const isOn   = gState === 'on';
                        const isMixed = gState === 'mixed';
                        const savingAll = ctrl.saving === `all:${f.key}`;
                        return (
                            <div key={f.key} className={`flex flex-col gap-2 p-3 rounded-xl border-2 transition-colors ${isOn ? 'border-green-200 bg-green-50' : isMixed ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-semibold ${C[f.key].label}`}>{f.label}</span>
                                    {savingAll
                                        ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                                        : <Toggle
                                            enabled={isOn}
                                            mixed={isMixed}
                                            onChange={() => ctrl.handleToggleAll(f.key, !isOn)}
                                            disabled={savingAll}
                                            size="md"
                                            trackColor={C[f.key].track}
                                        />
                                    }
                                </div>
                                <p className="text-xs text-gray-400 leading-tight">{f.description}</p>
                                <p className={`text-xs font-medium ${isOn ? 'text-green-600' : isMixed ? 'text-amber-600' : 'text-gray-500'}`}>
                                    {isOn ? 'All users ON' : isMixed ? 'Mixed' : 'All users OFF'}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Per-user matrix */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
                    <h3 className="text-lg font-bold text-gray-800">
                        Per-User Access
                        <span className="ml-2 text-sm font-normal text-gray-400">
                            ({ctrl.filteredUsers.length}{ctrl.search ? ` of ${ctrl.stats.total}` : ''} users)
                        </span>
                    </h3>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by email or name…"
                            value={ctrl.search}
                            onChange={e => ctrl.setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 w-64"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-64">
                                    User
                                </th>
                                {FEATURES.map(f => (
                                    <th key={f.key} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[110px]">
                                        <span className={C[f.key].label}>{f.label}</span>
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Reset All
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {ctrl.filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={FEATURES.length + 2} className="px-5 py-12 text-center text-gray-400">
                                        {ctrl.search ? 'No users match your search.' : 'No users found.'}
                                    </td>
                                </tr>
                            ) : (
                                ctrl.filteredUsers.map(u => {
                                    const hasAnyRestriction = Object.values(u.access).some(v => !v);
                                    return (
                                        <tr key={u.userId} className={`transition-colors ${hasAnyRestriction ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-gray-50'}`}>

                                            {/* User identity */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${hasAnyRestriction ? 'bg-red-400' : 'bg-slate-500'}`}>
                                                        {(u.fullName ?? u.email)[0].toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        {u.fullName && (
                                                            <p className="text-sm font-medium text-gray-800 truncate">{u.fullName}</p>
                                                        )}
                                                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Per-feature toggle */}
                                            {FEATURES.map(f => {
                                                const enabled = u.access[f.key];
                                                const savingThis = ctrl.saving === `${u.userId}:${f.key}`;
                                                return (
                                                    <td key={f.key} className="px-4 py-4 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            {savingThis ? (
                                                                <div className="w-4 h-4 border-2 border-gray-300 border-t-slate-500 rounded-full animate-spin" />
                                                            ) : (
                                                                <Toggle
                                                                    enabled={enabled}
                                                                    onChange={() => ctrl.handleToggle(u.userId, f.key, !enabled)}
                                                                    size="sm"
                                                                    trackColor={C[f.key].track}
                                                                />
                                                            )}
                                                            <span className={`text-xs font-medium ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
                                                                {enabled ? 'On' : 'Off'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                );
                                            })}

                                            {/* Reset button */}
                                            <td className="px-4 py-4 text-center">
                                                {hasAnyRestriction ? (
                                                    <button
                                                        disabled={ctrl.saving === `reset:${u.userId}`}
                                                        onClick={() => ctrl.handleReset(u.userId)}
                                                        title="Restore full access"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition disabled:opacity-50"
                                                    >
                                                        {ctrl.saving === `reset:${u.userId}`
                                                            ? <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                                                            : <CheckCircle size={12} />
                                                        }
                                                        Restore
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-300">Full access</span>
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

            <p className="text-xs text-gray-400 text-center pb-2">
                Changes take effect on the user's next page load · Amber switch = mixed (some users on, some off)
            </p>
        </div>
    );
}
