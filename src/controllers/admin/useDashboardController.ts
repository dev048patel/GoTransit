/**
 * useDashboardController.ts — GoTransit Regina  [MVC Controller]
 *
 * Provides Dashboard metrics and chart data.
 * "Total Active Users" now reflects REAL registered users from UserRegistry,
 * with mock count as the baseline (simulating pre-existing users).
 */

import { useState, useEffect } from 'react';
import { dashboardMetrics, usageChartData, costChartData } from '../../data/mock/adminMockData';
import { getRealUserCount } from '../../services/UserRegistry';

const MOCK_BASELINE = 12543; // Pretend this many users existed before our registry

export function useDashboardController() {
    const [realCount, setRealCount] = useState(0);

    // Poll the API every 5 seconds so Dashboard card updates live
    useEffect(() => {
        const refresh = async () => setRealCount(await getRealUserCount());
        refresh();
        const interval = setInterval(refresh, 5000);
        return () => clearInterval(interval);
    }, []);

    const metrics = {
        ...dashboardMetrics,
        totalUsers: {
            value: MOCK_BASELINE + realCount,
            trend: realCount > 0 ? realCount : dashboardMetrics.totalUsers.trend,
        },
    };

    return { metrics, usageChartData, costChartData, realCount };
}
