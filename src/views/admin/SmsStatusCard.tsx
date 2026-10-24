/**
 * SmsStatusCard.tsx — Transit Regina  [VIEW — MVC]
 * Text alerts today, on the admin Security page: is the SMS service up, what has it sent, the
 * button that turns alerts off for the day, and the dry run switch and pilot numbers.
 */
import { MessageSquareOff, X } from 'lucide-react';
import { useSmsStatusController } from '../../controllers/admin/useSmsStatusController';
import { verifyTwoStepCode } from '../../controllers/admin/usePersonController';
import { Badge, Card, ConfirmDialog, btn, when } from '../components/admin/ui';

const MODE_TONE = { live: 'good', pilot: 'info', 'dry run': 'warn', off: 'bad' } as const;

export default function SmsStatusCard() {
    const { status, error, confirm, closeConfirm, askOutage, counts, settings, askDryRun, pilotDraft, setPilotDraft, pilotError, addPilot, removePilot } = useSmsStatusController();
    if (!status && !error) return null;
    if (status && !status.configured) return null;   // the SMS service isn't deployed yet

    const outage = status?.outage;
    return (
        <Card title="Text alerts today" className="mb-4" action={
            !outage && status?.configured
                ? <button onClick={askOutage} className={btn.dangerPlain}><MessageSquareOff size={16} /> Declare SMS outage today</button>
                : undefined
        }>
            <div className="px-5 py-4 space-y-3 text-sm">
                {error && <p role="alert" className="text-red-700">Could not load the SMS status: {error}</p>}
                {status?.error && <p role="alert" className="text-amber-800">{status.error}</p>}
                {outage && (
                    <p className="text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                        Alerts are off for today ({when(outage.declared_at)}): {outage.cause} {outage.emails_sent} rider{outage.emails_sent === 1 ? '' : 's'} emailed. They start again tomorrow.
                    </p>
                )}
                {status?.configured && (
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-700">
                        <span className="flex items-center gap-2">
                            <Badge tone={status.up ? 'good' : 'bad'}>{status.up ? 'Service up' : 'Service not checking in'}</Badge>
                            {status.mode && <Badge tone={MODE_TONE[status.mode]}>{status.mode}</Badge>}
                            <span className="text-xs text-slate-500">last check-in {when(status.lastSeen)}</span>
                        </span>
                        <span><strong className="tabular-nums">{counts.plans}</strong> trips planned</span>
                        <span><strong className="tabular-nums">{counts.sent}</strong> texts sent</span>
                        <span><strong className="tabular-nums">{counts.waiting}</strong> still to send</span>
                        <span><strong className="tabular-nums">{counts.notSent}</strong> not sent (late, failed or held)</span>
                        {status.quota && <span>quota <strong className="tabular-nums">{status.quota.sent_count}/{status.quota.quota}</strong></span>}
                    </div>
                )}
                {status?.configured && settings === null && (
                    <p className="text-amber-800">To set dry run and pilot numbers here, run <code>docs/security/sms_003_send_settings.sql</code> in Supabase. Until then nothing is sent for real.</p>
                )}
                {settings && (
                    <div className="border-t border-slate-100 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="font-medium text-slate-900">Dry run</div>
                                <div className="text-xs text-slate-500">
                                    {settings.dryRun ? 'On: texts are recorded but not sent.' : settings.allowlist.length ? 'Off: real texts go to the pilot numbers only.' : 'Off: real texts go to every rider with text alerts on.'}
                                    {settings.updatedAt && <> Changed {when(settings.updatedAt)}.</>}
                                </div>
                            </div>
                            <button role="switch" aria-checked={settings.dryRun} aria-label="Dry run" onClick={() => askDryRun(!settings.dryRun)}
                                className={'relative w-11 h-6 rounded-full transition flex-none ' + (settings.dryRun ? 'bg-amber-500' : 'bg-slate-300')}>
                                <span className={'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ' + (settings.dryRun ? 'translate-x-5' : '')} />
                            </button>
                        </div>
                        <div>
                            <div className="font-medium text-slate-900">Pilot numbers</div>
                            <div className="text-xs text-slate-500">When there are any, only these numbers get real texts.</div>
                            <ul className="flex flex-wrap gap-1.5 mt-2">
                                {settings.allowlist.map(n => (
                                    <li key={n} className="inline-flex items-center gap-1 rounded-full bg-slate-100 pl-2.5 pr-1 py-0.5 text-xs text-slate-700 tabular-nums">
                                        {n}
                                        <button onClick={() => removePilot(n)} aria-label={`Remove ${n}`} className="p-0.5 rounded-full hover:bg-slate-200"><X size={12} /></button>
                                    </li>
                                ))}
                                {settings.allowlist.length === 0 && <li className="text-xs text-slate-400">None: everyone.</li>}
                            </ul>
                            <form onSubmit={e => { e.preventDefault(); addPilot(); }} className="flex gap-2 mt-2">
                                <input value={pilotDraft} onChange={e => setPilotDraft(e.target.value)} placeholder="306-555-0111" inputMode="tel" aria-label="Pilot number to add"
                                    className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30" />
                                <button type="submit" disabled={!pilotDraft.trim()} className={btn.plain}>Add</button>
                            </form>
                            {pilotError && <p role="alert" className="text-xs text-red-700 mt-1">{pilotError}</p>}
                        </div>
                    </div>
                )}
            </div>
            <ConfirmDialog request={confirm} onClose={closeConfirm} verifyCode={verifyTwoStepCode} />
        </Card>
    );
}
