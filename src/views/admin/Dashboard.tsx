import React from 'react';
import MetricCard from '../../components/admin/MetricCard';
import { Users, Route, Activity, DollarSign } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import { useDashboardController } from '../../controllers/admin/useDashboardController';

export default function Dashboard() {
    // Controller: Handles logic and state
    const { metrics, usageChartData, costChartData } = useDashboardController();

    // View: Renders the UI with data from the controller
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-gray-500">Welcome back, Admin. Here's what's happening with GoTransit today.</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Active Users"
                    value={metrics.totalUsers.value.toLocaleString()}
                    icon={Users}
                    color="blue"
                    trend={{ value: metrics.totalUsers.trend, isPositive: true }}
                    subtext="vs last month"
                />
                <MetricCard
                    title="Active Routes"
                    value={metrics.activeRoutes.value.toString()}
                    icon={Route}
                    color="green"
                    trend={{ value: metrics.activeRoutes.trend, isPositive: metrics.activeRoutes.trend >= 0 }}
                    subtext="4 Hidden"
                />
                <MetricCard
                    title="Daily API Calls"
                    value={metrics.dailyTraffic.value}
                    icon={Activity}
                    color="purple"
                    trend={{ value: metrics.dailyTraffic.trend, isPositive: true }}
                    subtext="vs yesterday"
                />
                <MetricCard
                    title="Est. Monthly Cost"
                    value={metrics.apiCost.value}
                    icon={DollarSign}
                    trend={{ value: Math.abs(metrics.apiCost.trend), isPositive: metrics.apiCost.trend < 0 }} // Negative cost trend is positive!
                    color="yellow"
                    subtext="vs last month"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Feature Usage */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Feature Usage Analytics</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={usageChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} dy={10} />
                                <YAxis tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#F3F4F6' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="places" name="Place Searches" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="directions" name="Route Directions" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Cost Projection */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">API Cost Tracker</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={costChartData}>
                                <defs>
                                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="date" tickLine={false} axisLine={false} hide />
                                <YAxis tickLine={false} axisLine={false} unit="$" />
                                <Tooltip />
                                <Area type="monotone" dataKey="actual" stroke="#F59E0B" fillOpacity={1} fill="url(#colorActual)" />
                                <Line type="monotone" dataKey="projected" stroke="#9CA3AF" strokeDasharray="5 5" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-sm text-gray-500 text-center">
                        Projected to stay under budget ($500 limit)
                    </div>
                </div>
            </div>
        </div>
    );
}
