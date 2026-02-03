// Mock Data for Admin Dashboard
import { Route, User, Notification } from '../../models/admin/AdminTypes';

// 1. Dashboard Metrics
export const dashboardMetrics = {
    totalUsers: { value: 12543, trend: 12.5 },
    activeRoutes: { value: 42, trend: 0 },
    dailyTraffic: { value: "45.2k", trend: 8.4 },
    apiCost: { value: "$342.50", trend: -2.3 }, // Negative trend is good for cost
};

// 2. Charts Data
export const usageChartData = [
    { name: 'Mon', places: 4000, directions: 2400, routes: 2400 },
    { name: 'Tue', places: 3000, directions: 1398, routes: 2210 },
    { name: 'Wed', places: 2000, directions: 9800, routes: 2290 },
    { name: 'Thu', places: 2780, directions: 3908, routes: 2000 },
    { name: 'Fri', places: 1890, directions: 4800, routes: 2181 },
    { name: 'Sat', places: 2390, directions: 3800, routes: 2500 },
    { name: 'Sun', places: 3490, directions: 4300, routes: 2100 },
];

export const costChartData = [
    { date: 'Jan 01', actual: 120, projected: 140 },
    { date: 'Jan 05', actual: 132, projected: 145 },
    { date: 'Jan 10', actual: 101, projected: 150 },
    { date: 'Jan 15', actual: 134, projected: 155 },
    { date: 'Jan 20', actual: 190, projected: 160 },
    { date: 'Jan 25', actual: 230, projected: 165 },
    { date: 'Jan 30', actual: 210, projected: 170 },
];

// 3. Routes Data
export const mockRoutes: Route[] = Array.from({ length: 20 }).map((_, i) => ({
    id: `rt-${i + 1}`,
    route_num: i + 1,
    route_name: ["Dieppe/Broad North", "Argyle Park/University", "Sherwood Estates/University", "Hillsdale/Walsh Acres"][i % 4] + ` - Var ${String.fromCharCode(65 + (i % 3))}`,
    status: (i % 5 === 0 ? "Hidden" : "Active") as 'Active' | 'Hidden',
    stops_count: 25 + (i * 2),
    last_updated: "2 hours ago",
}));

// 4. Users Data
export const mockUsers: User[] = Array.from({ length: 50 }).map((_, i) => ({
    id: `usr-${i + 1}`,
    name: ["Alex Smith", "Sarah Johnson", "Mike Brown", "Emily Davis"][i % 4],
    email: `user${i}@example.com`,
    role: "Traveler",
    status: (i % 10 === 0 ? "Suspended" : "Active") as 'Active' | 'Suspended',
    registered: "Jan 12, 2026",
    last_login: i === 0 ? "Just now" : `${i * 2} hours ago`,
}));

// 5. Notifications
export const mockNotifications: Notification[] = [
    { id: 1, recipient: "(555) ***-1234", message: "Bus #42 is delaying 5 mins...", status: "Delivered", time: "2m ago" },
    { id: 2, recipient: "(555) ***-5678", message: "Route 3 detour active...", status: "Failed", time: "15m ago" },
    { id: 3, recipient: "(555) ***-9012", message: "Service restored on Route 1...", status: "Delivered", time: "1h ago" },
];
