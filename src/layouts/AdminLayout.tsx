import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Map, Users, Bell, FileText, Settings, Activity, Eye } from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, to }: { icon: any, label: string, to: string }) => (
    <Link to={to} className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors rounded-lg mb-1">
        <Icon size={20} />
        <span className="font-medium">{label}</span>
    </Link>
);

export default function AdminLayout() {
    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-800 text-white flex flex-col shadow-xl z-20">
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className="text-2xl">🛡️</span> Admin Portal
                    </h2>
                </div>

                <nav className="flex-1 p-4 overflow-y-auto">
                    <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/admin" />
                    <SidebarItem icon={Map} label="Route Manager" to="/admin/routes" />
                    <SidebarItem icon={Users} label="User Management" to="/admin/users" />
                    <SidebarItem icon={Bell} label="Notifications" to="/admin/notifications" />
                    <SidebarItem icon={Activity} label="System Health" to="/admin/health" />
                    <SidebarItem icon={Eye} label="Visitor Analytics" to="/admin/analytics" />
                    <SidebarItem icon={FileText} label="Reports" to="/admin/reports" />
                </nav>

                <div className="p-4 border-t border-slate-700">
                    <SidebarItem icon={Settings} label="Settings" to="/admin/settings" />
                    <Link to="/" className="flex items-center gap-3 px-4 py-3 text-blue-400 hover:text-blue-300 mt-2">
                        <span>← Back to Map</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-white shadow-sm border-b px-6 flex items-center justify-between z-10">
                    <h1 className="text-xl font-semibold text-gray-800">Overview</h1>

                    <div className="flex items-center gap-4">
                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                            <Bell size={20} />
                        </button>
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                            A
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
