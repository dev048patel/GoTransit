/**
 * useDashboardController.ts — GoTransit Regina  [MVC Controller]
 *
 * Real data sources:
 *  - registeredUsers   → Supabase profiles table (polled every 10s)
 *  - activeRoutes      → count of routes from static transitRoutes.ts
 *  - featureUsage      → LIVE from /api/features/weekly (polled every 10s)
 *  - trafficByDay      → LIVE from /api/features/daily (polled every 10s)
 *  - totalInteractions  → LIVE from /api/features/total
 */

import { useState, useEffect } from 'react';
import { getRealUserCount } from '../../models/services/UserRegistry';
import transitRoutes from '../../models/data/transitRoutes';

const baseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function useDashboardController() {
    const [registeredUsers, setRegisteredUsers] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [featureUsageData, setFeatureUsageData] = useState<{ day: string; places: number; directions: number }[]>([]);
    const [trafficPieData, setTrafficPieData] = useState<{ name: string; value: number }[]>([]);
    const [totalInteractions, setTotalInteractions] = useState(0);

    const activeRoutes = transitRoutes.length;   // All routes from static data are "active"

    useEffect(() => {
        const refresh = async () => {
            try {
                // Fetch all data in parallel
                const [userCount, weeklyRes, dailyRes, totalRes] = await Promise.all([
                    getRealUserCount(),
                    fetch(`${baseUrl}/api/features/weekly`).then(r => r.ok ? r.json() : []),
                    fetch(`${baseUrl}/api/features/daily`).then(r => r.ok ? r.json() : []),
                    fetch(`${baseUrl}/api/features/total`).then(r => r.ok ? r.json() : { total: 0 }),
                ]);

                setRegisteredUsers(userCount);
                setFeatureUsageData(weeklyRes);
                setTrafficPieData(dailyRes);
                setTotalInteractions(totalRes.total);
            } catch (err) {
                console.error('[Dashboard] Error fetching data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        refresh();
        const interval = setInterval(refresh, 10_000);
        return () => clearInterval(interval);
    }, []);

    return {
        registeredUsers,
        activeRoutes,
        isLoading,
        featureUsageData,
        trafficPieData,
        totalInteractions,
    };
}
