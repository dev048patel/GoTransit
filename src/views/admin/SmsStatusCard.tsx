/**
 * SmsStatusCard.tsx — Transit Regina  [VIEW — MVC]
 * Text alerts today, on the admin Security page: is the SMS service up, what has it sent, and the
 * button that turns alerts off for the day.
 */
import { MessageSquareOff } from 'lucide-react';
import { useSmsStatusController } from '../../controllers/admin/useSmsStatusController';
import { verifyTwoStepCode } from '../../controllers/admin/usePersonController';
import { Badge, Card, ConfirmDialog, btn, when } from '../components/admin/ui';

const MODE_TONE = { live: 'good', pilot: 'info', 'dry run': 'warn', off: 'bad' } as const;

export default function SmsStatusCard() {
    const { status, error, confirm, closeConfirm, askOutage, counts } = useSmsStatusController();
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
            </div>
            <ConfirmDialog request={confirm} onClose={closeConfirm} verifyCode={verifyTwoStepCode} />
        </Card>
    );
}
