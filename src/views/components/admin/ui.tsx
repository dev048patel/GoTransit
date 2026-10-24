/**
 * ui.tsx — the shared building blocks of the admin panel, so every page looks and behaves the same.
 */
import React, { useEffect, useState } from 'react';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}

export function Card({ title, action, children, className = '' }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <section className={'bg-white rounded-xl border border-slate-200 ' + className}>
            {title && (
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}

export function Stat({ label, value, sub, live }: { label: string; value: React.ReactNode; sub?: string; live?: boolean }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                {live && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>}
                {label}
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">{value}</div>
            {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
        </div>
    );
}

const TONES = {
    neutral: 'bg-slate-100 text-slate-700', good: 'bg-emerald-100 text-emerald-800', warn: 'bg-amber-100 text-amber-800',
    bad: 'bg-red-100 text-red-800', info: 'bg-blue-100 text-blue-800',
};
export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
    return <span className={'inline-block px-2 py-0.5 rounded-full text-xs font-semibold ' + TONES[tone]}>{children}</span>;
}

export const btn = {
    primary: 'inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#003DA5] text-white text-sm font-semibold hover:bg-[#002f80] disabled:opacity-50',
    plain: 'inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50',
    danger: 'inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50',
    dangerPlain: 'inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50',
};

export const when = (iso?: string | null) => iso ? new Date(iso).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export interface ConfirmRequest {
    title: string;
    body: string;
    confirmLabel: string;
    danger?: boolean;
    /** The person must type this exactly (used for actions that cannot be undone). */
    typeToConfirm?: string;
    askReason?: boolean;
    run: (reason: string) => Promise<void>;
}

/**
 * One confirmation dialog for the whole panel. How much it asks scales with the action:
 * a plain confirm, a reason, or typing the person's email. If the backend asks for a fresh
 * authenticator code, the dialog collects it (via `verifyCode`) and tries again.
 */
export function ConfirmDialog({ request, onClose, verifyCode }: { request: ConfirmRequest | null; onClose: () => void; verifyCode: (code: string) => Promise<void> }) {
    const [typed, setTyped] = useState(''); const [reason, setReason] = useState(''); const [code, setCode] = useState('');
    const [needCode, setNeedCode] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
    useEffect(() => { setTyped(''); setReason(''); setCode(''); setNeedCode(false); setError(''); setBusy(false); }, [request]);
    if (!request) return null;

    const ready = (!request.typeToConfirm || typed.trim().toLowerCase() === request.typeToConfirm.toLowerCase())
        && (!request.askReason || reason.trim().length >= 3) && (!needCode || /^\d{6}$/.test(code));

    const go = async () => {
        setBusy(true); setError('');
        try {
            if (needCode) await verifyCode(code);
            await request.run(reason.trim());
            onClose();
        } catch (e) {
            const err = e as Error & { code?: string };
            if (err.code === 'fresh_two_step_required') { setNeedCode(true); setCode(''); setError(''); }
            else setError(err.message || 'That did not work. Please try again.');
        } finally { setBusy(false); }
    };
    const field = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5]';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h2 id="confirm-title" className="text-lg font-bold text-slate-900">{request.title}</h2>
                <p className="text-sm text-slate-600 mt-2">{request.body}</p>

                {request.askReason && (
                    <label className="block mt-4 text-sm font-medium text-slate-700">Reason (saved in the activity log)
                        <input value={reason} onChange={e => setReason(e.target.value)} maxLength={200} className={field + ' mt-1'} autoFocus />
                    </label>
                )}
                {request.typeToConfirm && (
                    <label className="block mt-4 text-sm font-medium text-slate-700">Type <span className="font-mono text-red-700">{request.typeToConfirm}</span> to confirm
                        <input value={typed} onChange={e => setTyped(e.target.value)} className={field + ' mt-1 font-mono'} autoComplete="off" />
                    </label>
                )}
                {needCode && (
                    <label className="block mt-4 text-sm font-medium text-slate-700">Enter the 6-digit code from your authenticator app
                        <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus
                            className={field + ' mt-1 text-center text-xl tracking-[0.3em] font-mono'} />
                        <span className="block text-xs font-normal text-slate-500 mt-1">This action needs a code entered in the last 10 minutes.</span>
                    </label>
                )}
                {error && <p role="alert" className="text-sm text-red-700 mt-3">{error}</p>}

                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className={btn.plain}>Cancel</button>
                    <button onClick={go} disabled={!ready || busy} className={request.danger ? btn.danger : btn.primary}>{busy ? 'Working…' : request.confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}

/** Plain names for the kinds of event the backend records. */
export const EVENT_LABEL: Record<string, string> = {
    user_deleted: 'Account deleted', role_changed: 'Role changed', status_changed: 'Status changed', user_updated: 'Account edited',
    feature_access_changed: 'Feature changed', route_changed: 'Route changed', sms_broadcast: 'Text broadcast', sms_outage_declared: 'Text alerts turned off for the day', sms_settings_changed: 'Text sending changed', sms_outage: 'Text alerts down',
    personal_data_viewed: 'Personal data viewed', events_handled: 'Events marked handled',
    role_changed_db: 'Role changed in the database', status_changed_db: 'Status changed in the database',
    auth_failed: 'Request without a valid login', admin_denied: 'Non-admin tried an admin action',
    admin_two_step_missing: 'Admin login without a two-step code', rate_limited: 'Too many requests',
    validation_failed: 'Malformed request', cors_blocked: 'Request from an unknown website', webhook_rejected: 'Forged text-message callback',
    burst: 'Repeated probing', dependency_down: 'Service down', dependency_recovered: 'Service recovered', server_error: 'Server error',
};
