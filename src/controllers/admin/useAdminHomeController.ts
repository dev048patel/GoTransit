/**
 * useAdminHomeController.ts — Transit Regina  [MVC Controller]
 * The admin home page's numbers. Refreshes every 15 seconds so the page shows the app as it is now.
 */
import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../../models/lib/apiClient';

export interface Overview {
    at: string;
    live: { activeNow: number; signedInNow: number; buses: number | null };
    today: { visitors: number; places: number; directions: number; signups: number };
    totals: { users: number; signupsWeek: number };
    trend: { day: string; places: number; directions: number; visitors: number }[];
    attention: { level: 'critical' | 'warning'; text: string; link: string }[];
    recent: { type: string; severity: string; message: string; admin: string; created_at: string }[];
}

const REFRESH_MS = 15_000;

export function useAdminHomeController() {
    const [data, setData] = useState<Overview | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try { setData(await (await apiGet('/api/admin/overview')).json()); setError(null); }
        catch (e) { setError((e as Error).message); }
    }, []);

    useEffect(() => {
        load();
        // no polling while the tab is in the background
        const id = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
        return () => clearInterval(id);
    }, [load]);

    return { data, error };
}
