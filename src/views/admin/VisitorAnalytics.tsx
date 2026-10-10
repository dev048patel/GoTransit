/*
  Visitor Analytics Admin View
  Displays real-time visitor data: IP addresses, devices, browsers, OS, and activity.
  All data comes from props via the controller (MVC pattern).
*/
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useVisitorAnalyticsController, DatePreset } from '../../controllers/admin/useVisitorAnalyticsController';
import {
    Globe, Monitor, Smartphone, Tablet, Chrome, Clock, Users, Eye,
    RefreshCw, Wifi, Activity, MapPin, Calendar, ChevronDown, ChevronRight, Search, Shield
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
    const {
        visitors, summary, loading, error, lastRefreshed, refresh,
        activePreset, dateFrom, dateTo, applyPreset, setCustomRange
    } = useVisitorAnalyticsController();
    const [expandedVisitor, setExpandedVisitor] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredVisitors = useMemo(() => {
        if (!searchQuery.trim()) return visitors;
        const q = searchQuery.toLowerCase();
        return visitors.filter(v =>
            v.ip.toLowerCase().includes(q) ||
            v.browser.toLowerCase().includes(q) ||
            v.os.toLowerCase().includes(q) ||
            v.device.toLowerCase().includes(q) ||
            (v.email && v.email.toLowerCase().includes(q)) ||
            (v.fullName && v.fullName.toLowerCase().includes(q))
        );
    }, [visitors, searchQuery]);

    const isActive = (lastSeen: string) => {
        return (Date.now() - new Date(lastSeen).getTime()) < 2 * 60 * 1000; // active within 2 min
    };

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

            {/* Date Filter Bar */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex flex-wrap items-center gap-3">
                    <Calendar size={18} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filter:</span>

                    {/* Preset Buttons */}
                    {([['today', 'Today'], ['7days', '7 Days'], ['30days', '30 Days'], ['all', 'All Time']] as [DatePreset, string][]).map(([preset, label]) => (
                        <button
                            key={preset}
                            onClick={() => applyPreset(preset)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${activePreset === preset
                                    ? 'bg-blue-500 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {label}
                        </button>
                    ))}

                    <div className="w-px h-6 bg-gray-200 mx-1" />

                    {/* Custom Date Inputs */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setCustomRange(e.target.value, dateTo)}
                            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        <label className="text-xs text-gray-500">To</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setCustomRange(dateFrom, e.target.value)}
                            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </div>
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
                                <p className="text-2xl font-bold text-gray-900">{summary.activeNow}</p>
                                <p className="text-sm text-gray-500">Active Now</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-50 rounded-lg">
                                <Users size={22} className="text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{summary.visitorsInRange}</p>
                                <p className="text-sm text-gray-500">Visitors in Range</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-50 rounded-lg">
                                <Eye size={22} className="text-purple-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{summary.totalPageViews}</p>
                                <p className="text-sm text-gray-500">Page Views</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-yellow-50 rounded-lg">
                                <Activity size={22} className="text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{summary.totalVisitors}</p>
                                <p className="text-sm text-gray-500">Total Unique Visitors</p>
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

            {/* Unique Visitors — Expandable Cards */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Globe size={20} className="text-blue-500" />
                        Unique Visitors
                        <span className="ml-2 text-sm font-normal text-gray-400">
                            ({filteredVisitors.length}{searchQuery ? ` of ${visitors.length}` : ''} unique)
                        </span>
                    </h3>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name, email, IP, browser..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-64"
                        />
                    </div>
                </div>

                {/* Table header */}
                <div className="bg-gray-50 border-b border-gray-100">
                    <div className="grid grid-cols-12 px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-1"></div>
                        <div className="col-span-3">IP / User</div>
                        <div className="col-span-2">Browser</div>
                        <div className="col-span-2">Device</div>
                        <div className="col-span-2">Last Active</div>
                        <div className="col-span-2 text-center">Views</div>
                    </div>
                </div>

                {/* Visitor rows */}
                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                    {filteredVisitors.length === 0 ? (
                        <div className="px-6 py-12 text-center text-gray-400">
                            <Clock size={32} className="mx-auto mb-3 opacity-50" />
                            <p>{searchQuery ? 'No visitors match your search.' : 'No visitors recorded yet.'}</p>
                        </div>
                    ) : (
                        filteredVisitors.map((visitor, index) => {
                            const expanded = expandedVisitor === index;
                            const active = isActive(visitor.lastSeen);
                            return (
                                <div key={index}>
                                    {/* Collapsed row */}
                                    <button
                                        onClick={() => setExpandedVisitor(expanded ? null : index)}
                                        className={`w-full grid grid-cols-12 px-6 py-3.5 items-center text-left hover:bg-gray-50 transition-colors ${expanded ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <div className="col-span-1 flex items-center">
                                            {expanded
                                                ? <ChevronDown size={16} className="text-blue-500" />
                                                : <ChevronRight size={16} className="text-gray-400" />
                                            }
                                        </div>
                                        <div className="col-span-3 flex items-center gap-2 min-w-0">
                                            {active && (
                                                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                                                </span>
                                            )}
                                            <div className="min-w-0">
                                                <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-700">{visitor.ip}</code>
                                                {visitor.email && (
                                                    <p className="text-xs text-blue-600 font-medium truncate mt-0.5">{visitor.email}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-span-2 text-sm text-gray-700">{visitor.browser}</div>
                                        <div className="col-span-2 text-sm flex items-center gap-1.5">
                                            <DeviceIcon device={visitor.device} />
                                            <span className="text-gray-700">{visitor.device}</span>
                                        </div>
                                        <div className="col-span-2 text-sm">
                                            <span className={active ? 'text-green-600 font-medium' : 'text-gray-700'}>
                                                {active ? 'Online now' : getTimeSince(visitor.lastSeen)}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                                {visitor.pageViews}
                                            </span>
                                        </div>
                                    </button>

                                    {/* Expanded detail */}
                                    {expanded && (
                                        <div className="px-6 pb-5 pt-1 bg-blue-50/30 border-t border-blue-100/50">
                                            <div className="ml-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                                                {/* Info column */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Session Info</h4>
                                                    <div className="space-y-2 text-sm">
                                                        {visitor.fullName && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-gray-500">Name</span>
                                                                <span className="font-medium text-gray-800">{visitor.fullName}</span>
                                                            </div>
                                                        )}
                                                        {visitor.email && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-gray-500">Email</span>
                                                                <span className="font-medium text-blue-600">{visitor.email}</span>
                                                            </div>
                                                        )}
                                                        {visitor.email && (
                                                            <div className="pt-1">
                                                                <Link
                                                                    to={`/admin/fac?search=${encodeURIComponent(visitor.email)}`}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition"
                                                                >
                                                                    <Shield size={12} />
                                                                    Manage Access
                                                                </Link>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-500">Operating System</span>
                                                            <span className="font-medium text-gray-800">{visitor.os}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-500">First Seen</span>
                                                            <span className="font-medium text-gray-800">{formatTime(visitor.firstSeen)} &middot; {formatDate(visitor.firstSeen)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-500">Last Active</span>
                                                            <span className="font-medium text-gray-800">{formatTime(visitor.lastSeen)} &middot; {formatDate(visitor.lastSeen)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-500">Total Page Views</span>
                                                            <span className="font-medium text-gray-800">{visitor.pageViews}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Pages visited column */}
                                                <div className="md:col-span-2 space-y-3">
                                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                        Pages Visited ({visitor.pagesVisited.length})
                                                    </h4>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {visitor.pagesVisited.map((page, i) => (
                                                            <span key={i} className="inline-flex items-center gap-1 text-blue-700 font-mono text-xs bg-blue-100 px-2 py-1 rounded-md">
                                                                <MapPin size={10} className="text-blue-400 flex-shrink-0" />
                                                                {page}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
