import { dashboardMetrics, usageChartData, costChartData } from '../../data/mock/adminMockData';

export function useDashboardController() {
    return {
        metrics: dashboardMetrics,
        usageChartData,
        costChartData
    };
}
