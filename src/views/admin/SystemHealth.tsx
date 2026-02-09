import React from 'react';
import MetricCard from '../../components/admin/MetricCard';
import { Activity, Database, Server, Wifi, MapPin } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const healthData = Array.from({ length: 24 }).map((_, i) => ({
    time: `${i}:00`,
    latency: Math.floor(Math.random() * 100) + 20,
    errors: Math.floor(Math.random() * 5)
}));

export default function SystemHealth() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">System Health</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="Google Maps API" value="Operational" icon={MapPin} color="green" subtext="12ms latency" />
                <MetricCard title="GTFS Feed" value="Operational" icon={Wifi} color="green" subtext="Updated 2m ago" />
                <MetricCard title="Database" value="Operational" icon={Database} color="green" subtext="0.5% load" />
                <MetricCard title="SMS Gateway" value="Degraded" icon={Server} color="yellow" subtext="High latency" />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4">API Latency (24h)</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={healthData}>
                            <XAxis dataKey="time" hide />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="latency" stroke="#3B82F6" fill="#EFF6FF" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
