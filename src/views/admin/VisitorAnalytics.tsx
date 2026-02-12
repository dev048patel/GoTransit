/*
  Visitor Analytics Admin View
  Displays real-time visitor data: IP addresses, devices, browsers, OS, and activity.
  All data comes from props via the controller (MVC pattern).
*/
import React, { useState } from 'react';
import { useVisitorAnalyticsController } from '../../controllers/admin/useVisitorAnalyticsController';
import {
    Globe, Monitor, Smartphone, Tablet, Chrome, Clock, Users, Eye,
    RefreshCw, Wifi, Activity, MapPin
} from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const DeviceIcon = ({ device }: { device: string }) => {
    if (device === 'Mobile') return <Smartphone size={16} className="text-blue-500" />;
    if (device === 'Tablet') return <Tablet size={16} className="text-purple-500" />;
    return <Monitor size={16} className="text-gray-500" />;
};

export default function VisitorAnalytics() {
    const { visitors, summary, loading, error, lastRefreshed, refresh } = useVisitorAnalyticsController();
    const [activeTab, setActiveTab] = useState<'live' | 'browsers' | 'devices'>('live');

    if (loading && !summary) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <RefreshCw size={40} className="mx-auto text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-500">Loading analytics data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-600 font-medium">{error}</p>
                <button onClick={refresh} className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                    Retry
                </button>
            </div>
        );
    }

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getTimeSince = (timestamp: string) => {
        const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Visitor Analytics</h1>
                    <p className="text-gray-500 mt-1">Real-time visitor tracking and insights</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                        Last updated: {lastRefreshed.toLocaleTimeString()}
                    </span>
                    <button
                        onClick={refresh}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition shadow-sm"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <Wifi size={22} className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{summary.activeLastHour}</p>
                                <p className="text-sm text-gray-500">Active Last Hour</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-50 rounded-lg">
                                <Users size={22} className="text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{summary.uniqueVisitors24h}</p>
                                <p className="text-sm text-gray-500">Unique Visitors (24h)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-50 rounded-lg">
                                <Eye size={22} className="text-purple-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{summary.totalVisits24h}</p>
                                <p className="text-sm text-gray-500">Page Views (24h)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-yellow-50 rounded-lg">
                                <Activity size={22} className="text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{summary.totalVisitsAllTime}</p>
                                <p className="text-sm text-gray-500">Total Visits (All Time)</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Row */}
            {summary && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Browser Breakdown */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Chrome size={20} className="text-blue-500" />
                            Browsers
                        </h3>
                        {summary.browsers.length > 0 ? (
                            <>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={summary.browsers}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={70}
                                                dataKey="count"
                                                nameKey="name"
                                            >
                                                {summary.browsers.map((_, index) => (
                                                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-3 space-y-2">
                                    {summary.browsers.map((b, i) => (
                                        <div key={b.name} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                <span className="text-gray-700">{b.name}</span>
                                            </div>
                                            <span className="font-medium text-gray-900">{b.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-gray-400 text-center py-12">No data yet</p>
                        )}
                    </div>

                    {/* Device Breakdown */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Monitor size={20} className="text-green-500" />
                            Devices
                        </h3>
                        {summary.devices.length > 0 ? (
                            <>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={summary.devices}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={70}
                                                dataKey="count"
                                                nameKey="name"
                                            >
                                                {summary.devices.map((_, index) => (
                                                    <Cell key={index} fill={COLORS[(index + 3) % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-3 space-y-2">
                                    {summary.devices.map((d, i) => (
                                        <div key={d.name} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <DeviceIcon device={d.name} />
                                                <span className="text-gray-700">{d.name}</span>
                                            </div>
                                            <span className="font-medium text-gray-900">{d.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-gray-400 text-center py-12">No data yet</p>
                        )}
                    </div>

                    {/* Top Pages */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <MapPin size={20} className="text-purple-500" />
                            Top Pages
                        </h3>
                        {summary.topPages.length > 0 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={summary.topPages} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                        <XAxis type="number" tickLine={false} axisLine={false} />
                                        <YAxis
                                            type="category"
                                            dataKey="path"
                                            tickLine={false}
                                            axisLine={false}
                                            width={100}
                                            style={{ fontSize: '12px' }}
                                        />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-gray-400 text-center py-12">No data yet</p>
                        )}
                    </div>
                </div>
            )}

            {/* Live Visitor Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Globe size={20} className="text-blue-500" />
                        Recent Visitors
                        <span className="ml-2 text-sm font-normal text-gray-400">({visitors.length} records)</span>
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 text-left">
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP Address</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Device</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Browser</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">OS</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Path</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {visitors.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        <Clock size={32} className="mx-auto mb-3 opacity-50" />
                                        <p>No visitors recorded yet. Data will appear as people visit the site.</p>
                                    </td>
                                </tr>
                            ) : (
                                visitors.slice(0, 50).map((visitor, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 text-sm whitespace-nowrap">
                                            <div className="text-gray-900 font-medium">{formatTime(visitor.timestamp)}</div>
                                            <div className="text-gray-400 text-xs">{getTimeSince(visitor.timestamp)}</div>
                                        </td>
                                        <td className="px-6 py-3 text-sm">
                                            <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{visitor.ip}</code>
                                        </td>
                                        <td className="px-6 py-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <DeviceIcon device={visitor.device} />
                                                <span className="text-gray-700">{visitor.device}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-sm text-gray-700">{visitor.browser}</td>
                                        <td className="px-6 py-3 text-sm text-gray-700">{visitor.os}</td>
                                        <td className="px-6 py-3 text-sm">
                                            <span className="text-blue-600 font-mono text-xs">{visitor.path}</span>
                                        </td>
                                        <td className="px-6 py-3 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${visitor.method === 'GET' ? 'bg-green-100 text-green-700' :
                                                    visitor.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-700'
                                                }`}>
                                                {visitor.method}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {visitors.length > 50 && (
                    <div className="p-4 bg-gray-50 text-center text-sm text-gray-500">
                        Showing 50 of {visitors.length} records
                    </div>
                )}
            </div>
        </div>
    );
}
