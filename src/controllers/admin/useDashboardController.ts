/**
 * useDashboardController.ts — GoTransit Regina  [MVC Controller]
 *
 * Real data sources:
 *  - registeredUsers   → Supabase profiles table (polled every 10s)
 *  - activeRoutes      → count of routes from static transitRoutes.ts
 *  - featureUsage      → static weekly bar-chart (no real tracking yet)
 *  - trafficByDay      → static pie-chart showing distribution placeholder
 */

import { useState, useEffect } from 'react';
import { getRealUserCount } from '../../services/UserRegistry';
import transitRoutes from '../../data/transitRoutes';

/* Weekly feature-usage bar chart (Places searched vs Saved directions) */
const featureUsageData = [
    { day: 'Mon', places: 124, directions: 83 },
    { day: 'Tue', places: 198, directions: 112 },
    { day: 'Wed', places: 175, directions: 97 },
    { day: 'Thu', places: 210, directions: 140 },
    { day: 'Fri', places: 262, directions: 158 },
    { day: 'Sat', places: 180, directions: 95 },
    { day: 'Sun', places: 145, directions: 72 },
];

/* Traffic/day pie chart — distribution across weekdays */
const trafficPieData = [
    { name: 'Mon', value: 124 },
    { name: 'Tue', value: 198 },
    { name: 'Wed', value: 175 },
    { name: 'Thu', value: 210 },
    { name: 'Fri', value: 262 },
    { name: 'Sat', value: 180 },
    { name: 'Sun', value: 145 },
];

export function useDashboardController() {
    const [registeredUsers, setRegisteredUsers] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const activeRoutes = transitRoutes.length;   // All routes from static data are "active"

    useEffect(() => {
        const refresh = async () => {
            const count = await getRealUserCount();
            setRegisteredUsers(count);
            setIsLoading(false);
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
    };
}
