/**
 * Dashboard.tsx — GoTransit Regina  [VIEW — MVC]
 *
 * Shows:
 *  - Traffic/day  → Pie chart
 *  - Active Routes → metric card (real count from static data)
 *  - Registered Users → metric card (real count from Supabase)
 *  - Feature Usage Analytics → Bar chart (Places vs Saved Directions, weekly)
 */

import React from 'react';
import { Users, Route, TrendingUp } from 'lucide-react';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useDashboardController } from '../../controllers/admin/useDashboardController';

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

function MetricCard({ title, value, icon: Icon, color, sub }: {
    title: string; value: string | number; icon: React.ElementType;
    color: 'blue' | 'green' | 'purple'; sub?: string;
}) {
    const bg = { blue: 'bg-blue-50', green: 'bg-green-50', purple: 'bg-purple-50' }[color];
    const ic = { blue: 'text-blue-500', green: 'text-green-500', purple: 'text-purple-500' }[color];
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${bg}`}>
                <Icon className={`w-6 h-6 ${ic}`} />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { registeredUsers, activeRoutes, isLoading, featureUsageData, trafficPieData } = useDashboardController();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">GoTransit Regina — Admin Overview</p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Active Routes"
                    value={activeRoutes}
                    icon={Route}
                    color="green"
                    sub="From Regina Transit open data"
                />
                <MetricCard
                    title="Registered Users"
                    value={isLoading ? '…' : registeredUsers}
                    icon={Users}
                    color="blue"
                    sub="From Supabase — live"
                />
                <MetricCard
                    title="Avg. Daily Interactions"
                    value="1,294"
                    icon={TrendingUp}
                    color="purple"
                    sub="Places + Directions (weekly avg)"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Feature Usage — Bar chart (2/3 width) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Feature Usage Analytics</h3>
                    <p className="text-xs text-gray-400 mb-4">Places Searched vs Saved Directions — Weekly</p>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={featureUsageData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="day" tickLine={false} axisLine={false} dy={8} tick={{ fontSize: 12 }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: '#F3F4F6' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '13px' }} />
                                <Bar dataKey="places" name="Place Searches" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="directions" name="Saved Directions" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Traffic / Day — Pie chart (1/3 width) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Traffic / Day</h3>
                    <p className="text-xs text-gray-400 mb-4">Interaction distribution by weekday</p>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={trafficPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={42}
                                    outerRadius={72}
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {trafficPieData.map((_, i) => (
                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                        {trafficPieData.map((d, i) => (
                            <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                                {d.name}: <span className="font-medium text-gray-800 ml-0.5">{d.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
