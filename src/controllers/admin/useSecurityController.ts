/**
 * useSecurityController.ts — Transit Regina  [MVC Controller]
 * Loads the security event list and system health for the admin Security page, refreshing every 30 s.
 * Repeats of the same thing from the same address are folded into one row with a count.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiGet, apiPost } from '../../models/lib/apiClient';

export interface SecurityEvent { id?: number; handledAt?: string | null; type: string; severity: 'info' | 'warning' | 'critical'; message: string; ip?: string | null; who?: string | null; path?: string | null; at: string; }
export interface EventGroup extends SecurityEvent { count: number; ids: number[]; paths: string[]; }
export interface HealthCheck { name: string; ok: boolean; detail: string; since: string; }
export interface SecurityData { events: SecurityEvent[]; stored: boolean; canHandle?: boolean; health: { lastRun: string | null; checks: HealthCheck[]; config: string[] }; }

export function useSecurityController() {
    const [data, setData] = useState<SecurityData | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Routine admin actions (info) live in the Activity log; this page opens on what may need a response
    const [filter, setFilter] = useState<'all' | 'warning' | 'critical'>('warning');
    const [showHandled, setShowHandled] = useState(false);

    const load = useCallback(async () => {
        try { setData(await (await apiGet('/api/admin/security' + (showHandled ? '?handled=1' : ''))).json()); setError(null); }
        catch (e) { setError((e as Error).message); }
    }, [showHandled]);

    /** Hide events that have been dealt with. Nothing is deleted; "Show handled" brings them back. */
    const markHandled = useCallback(async (ids: number[]) => {
        if (!ids.length) return;
        try { await apiPost('/api/admin/security/handled', { ids }); await load(); }
        catch (e) { setError((e as Error).message); }
    }, [load]);

    useEffect(() => {
        load();
        const id = setInterval(load, 30_000);
        return () => clearInterval(id);
    }, [load]);

    const groups = useMemo(() => {
        const out = new Map<string, EventGroup>();
        for (const e of data?.events ?? []) {           // newest first, so the first one seen sets the time shown
            if (!(filter === 'all' || e.severity === filter || (filter === 'warning' && e.severity === 'critical'))) continue;
            const key = [e.type, e.severity, e.ip, e.who, e.message, !!e.handledAt].join('|');
            const g = out.get(key) ?? { ...e, count: 0, ids: [], paths: [] };
            g.count++;
            if (e.id) g.ids.push(e.id);
            if (e.path && !g.paths.includes(e.path)) g.paths.push(e.path);
            out.set(key, g);
        }
        return [...out.values()];
    }, [data, filter]);

    const dayAgo = Date.now() - 86_400_000;
    const last24h = (data?.events ?? []).filter(e => !e.handledAt && new Date(e.at).getTime() > dayAgo);
    return {
        data, error, groups, filter, setFilter, reload: load, showHandled, setShowHandled, markHandled,
        counts: { critical: last24h.filter(e => e.severity === 'critical').length, warning: last24h.filter(e => e.severity === 'warning').length },
    };
}
