// Admin Dashboard Type Definitions (Models)

export interface Route {
    id: string;
    route_num: number;
    route_name: string;
    status: 'Active' | 'Hidden';
    stops_count: number;
    last_updated: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'Active' | 'Suspended';
    registered: string;
    last_active: string;
    isOnline: boolean;
}

export interface Notification {
    id: number;
    recipient: string;
    message: string;
    status: 'Delivered' | 'Failed' | 'Pending';
    time: string;
}

export interface DashboardMetrics {
    totalUsers: { value: number; trend: number };
    activeRoutes: { value: number; trend: number };
    dailyTraffic: { value: string; trend: number };
    apiCost: { value: string; trend: number };
}

export interface ChartDataPoint {
    name?: string;
    date?: string;
    time?: string;
    [key: string]: any;
}
