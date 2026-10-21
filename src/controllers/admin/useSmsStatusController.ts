/**
 * useSmsStatusController.ts — Transit Regina  [MVC Controller]
 * Today's state of the SMS alert service for the admin Security page, refreshed every 30 s, and the
 * "declare an outage" action (turns text alerts off for today and emails the affected riders).
 */
import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../../models/lib/apiClient';
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
    error?: string | null;
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

    const sum = (t?: Record<string, number>, ...keys: string[]) => keys.reduce((n, k) => n + (t?.[k] ?? 0), 0);
    return {
        status, error, reload: load, confirm, closeConfirm: () => setConfirm(null), askOutage,
        counts: {
            plans: sum(status?.plans, 'planned', 'partial', 'no_service', 'active', 'completed', 'cancelled'),
            sent: sum(status?.alerts, 'sent'),
            waiting: sum(status?.alerts, 'pending', 'queued'),
            notSent: sum(status?.alerts, 'failed', 'skipped', 'over_quota', 'capped', 'suppressed'),
        },
    };
}
