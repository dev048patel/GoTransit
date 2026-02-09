import React from 'react';
import DataTable from '../../components/admin/DataTable';
import StatusBadge from '../../components/admin/StatusBadge';
import { Bell, MessageSquare, Settings, Send } from 'lucide-react';
import { useNotificationCenterController } from '../../controllers/admin/useNotificationCenterController';
import { Notification } from '../../models/admin/AdminTypes';

// Tab Components
const SMSMonitor = ({ notifications }: { notifications: Notification[] }) => {
    const columns = [
        { header: 'Time', accessor: 'time' as const, className: 'text-gray-500 w-32' },
        { header: 'Recipient', accessor: 'recipient' as const },
        { header: 'Message', accessor: 'message' as const, className: 'text-gray-600' },
        { header: 'Status', accessor: (row: any) => <StatusBadge status={row.status} /> },
        {
            header: 'Action',
            accessor: (row: any) => row.status === 'Failed' ? <button className="text-blue-600 hover:underline">Retry</button> : null
        }
    ];

    return (
        <div className="space-y-4">
            <h3 className="font-bold text-gray-800">Real-time SMS Feed</h3>
            <DataTable columns={columns} data={notifications} />
        </div>
    );
};

const ServiceAlerts = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-4">Create New Alert</h3>
            <div className="grid gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Alert Title</label>
                    <input type="text" className="w-full p-2 border rounded-lg" placeholder="e.g., Downtown Detour" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Message</label>
                    <textarea className="w-full p-2 border rounded-lg h-24" placeholder="Describe the alert..." />
                </div>
                <div className="flex justify-end">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <Send size={16} /> Send Alert
                    </button>
                </div>
            </div>
        </div>
    </div>
);

const ProximitySettings = () => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 text-center text-gray-500">
        <Settings className="mx-auto mb-2 opacity-50" size={48} />
        <p>Proximity settings configuration coming soon.</p>
    </div>
);

export default function NotificationCenter() {
    // Controller: Handles logic and state
    const { activeTab, setActiveTab, notifications } = useNotificationCenterController();

    const tabs = [
        { id: 'sms', label: 'SMS Monitor', icon: MessageSquare },
        { id: 'alerts', label: 'Service Alerts', icon: Bell },
        { id: 'settings', label: 'Proximity Config', icon: Settings },
    ] as const;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Notification Center</h1>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === tab.id
                            ? 'border-blue-600 text-blue-600 bg-blue-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'sms' && <SMSMonitor notifications={notifications} />}
                {activeTab === 'alerts' && <ServiceAlerts />}
                {activeTab === 'settings' && <ProximitySettings />}
            </div>
        </div>
    );
}
