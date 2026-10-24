/**
 * useSmsStatusController.ts — Transit Regina  [MVC Controller]
 * Today's state of the SMS alert service for the admin Security page, refreshed every 30 s, and the
 * "declare an outage" action (turns text alerts off for today and emails the affected riders), and the
 * dry run switch and pilot numbers.
 */
import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPatch } from '../../models/lib/apiClient';
import type { ConfirmRequest } from '../../views/components/admin/ui';

export interface SmsStatus {
    configured: boolean;
    date: string;
    up?: boolean;
    lastSeen?: string | null;
    mode?: 'live' | 'dry run' | 'pilot' | 'off' | null;
    plans?: Record<string, number>;
    alerts?: Record<string, number>;
    quota?: { quota: number; sent_count: number; active_subscribers: number; planned_alerts: number } | null;
    outage?: { cause: string; declared_at: string; emails_sent: number } | null;
    /** null: sms.settings isn't there yet (script sms_003) */
    settings?: { dryRun: boolean; allowlist: string[]; updatedAt: string | null } | null;
    error?: string | null;
}

/** "+1 306 555 0111", "306-555-0111" → "+13065550111"; null when it isn't a Canadian number */
function pilotNumber(raw: string): string | null {
    let d = raw.replace(/\D/g, '');
    if (d.length === 10) d = '1' + d;
    return d.length === 11 && d.startsWith('1') ? `+${d}` : null;
}

export function useSmsStatusController() {
    const [status, setStatus] = useState<SmsStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

    const load = useCallback(async () => {
        try { setStatus(await (await apiGet('/api/admin/sms')).json()); setError(null); }
        catch (e) { setError((e as Error).message); }
    }, []);

    useEffect(() => {
        load();
        const id = setInterval(load, 30_000);
        return () => clearInterval(id);
    }, [load]);

    const riders = status?.quota?.active_subscribers ?? 0;
    const askOutage = () => setConfirm({
        title: 'Turn text alerts off for today?',
        body: `No more texts go out today, even if the SMS service recovers. Each rider with alerts still to come${riders ? ` (up to ${riders})` : ''} gets one email saying so. Alerts start again tomorrow on their own.`,
        confirmLabel: 'Turn off and email riders', danger: true, askReason: true,
        run: async (reason: string) => { await apiPost('/api/admin/sms/outage', { reason }); await load(); },
    });

    // ── Dry run and pilot numbers ──
    const settings = status?.settings ?? null;
    const save = (body: { dryRun?: boolean; allowlist?: string[] }) => async (reason: string) => { await apiPatch('/api/admin/sms/settings', { ...body, reason }); await load(); };
    const reach = (pilots: string[]) => pilots.length
        ? `Only the ${pilots.length} pilot number${pilots.length === 1 ? '' : 's'} get${pilots.length === 1 ? 's' : ''} real texts; everyone else stays in dry run.`
        : 'Every rider with text alerts on gets real texts, from the next alert due.';
    const askDryRun = (on: boolean) => setConfirm(on
        ? { title: 'Turn dry run on?', body: 'Texts are recorded but no longer sent, within 15 seconds. Use this to stop real texts straight away.', confirmLabel: 'Turn dry run on', run: save({ dryRun: true }) }
        : { title: 'Send real texts?', body: `${reach(settings?.allowlist ?? [])} Texts cost money and can't be taken back once sent.`, confirmLabel: 'Send real texts', danger: true, askReason: true, run: save({ dryRun: false }) });

    const [pilotDraft, setPilotDraft] = useState('');
    const [pilotError, setPilotError] = useState('');
    const askPilots = (pilots: string[]) => setConfirm({
        title: pilots.length ? 'Change the pilot numbers?' : 'Remove all pilot numbers?',
        body: settings?.dryRun ? 'Dry run is on, so nobody gets real texts yet. ' + (pilots.length ? `Once it is off, only these ${pilots.length} numbers will.` : 'Once it is off, every rider with text alerts on will.') : reach(pilots),
        confirmLabel: 'Save', danger: !settings?.dryRun && !pilots.length, askReason: !settings?.dryRun,
        run: async (reason: string) => { await save({ allowlist: pilots })(reason); setPilotDraft(''); },
    });
    const addPilot = () => {
        const n = pilotNumber(pilotDraft);
        if (!n) { setPilotError('Enter a Canadian number, like 306-555-0111'); return; }
        setPilotError('');
        if (!settings?.allowlist.includes(n)) askPilots([...(settings?.allowlist ?? []), n]);
    };
    const removePilot = (n: string) => askPilots((settings?.allowlist ?? []).filter(x => x !== n));

    const sum = (t?: Record<string, number>, ...keys: string[]) => keys.reduce((n, k) => n + (t?.[k] ?? 0), 0);
    return {
        status, error, reload: load, confirm, closeConfirm: () => setConfirm(null), askOutage,
        settings, askDryRun, pilotDraft, setPilotDraft: (v: string) => { setPilotDraft(v); setPilotError(''); }, pilotError, addPilot, removePilot,
        counts: {
            plans: sum(status?.plans, 'planned', 'partial', 'no_service', 'active', 'completed', 'cancelled'),
            sent: sum(status?.alerts, 'sent'),
            waiting: sum(status?.alerts, 'pending', 'queued'),
            notSent: sum(status?.alerts, 'failed', 'skipped', 'over_quota', 'capped', 'suppressed'),
        },
    };
}
