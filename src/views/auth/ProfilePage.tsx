/**
 * ProfilePage.tsx — GoTransit Regina user profile
 *
 * Sections:
 *   Header        – Avatar (initials), full name, edit button
 *   Personal Info  – Name, email (verified), phone (verified)
 *   Transit Prefs  – Home stop, favourite stops (5), favourite routes
 *   Notifications  – Toggle switches for alerts / delays / promos
 *   Appearance     – Light / Dark / System segmented control
 *   Accessibility  – Larger text, high-contrast toggles
 *   Security       – Change password, active sessions, last login
 *   Account        – Logout, delete account
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Bus, MapPin, Star, Bell, Sun, Moon, Monitor,
    Shield, LogOut, Trash2, Pencil, CheckCircle2,
    ChevronRight, Eye, Type, Contrast, Clock,
    Route as RouteIcon, Plus, X, ArrowLeft,
} from 'lucide-react';
import logo from '../../image.jpg';
import { motion } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Sample data — will be replaced with API data                       */
/* ------------------------------------------------------------------ */
const SAMPLE = {
    fullName: 'Dev Patel',
    email: 'dev.patel@uregina.ca',
    emailVerified: true,
    phone: '+1 306-555-0199',
    phoneVerified: true,
    homeStop: 'University of Regina Transit Hub',
    favouriteStops: [
        { id: '1', name: 'U of R Transit Hub', label: 'Campus' },
        { id: '2', name: 'Cornwall Centre', label: 'Work' },
        { id: '3', name: 'Golden Mile', label: 'Home' },
    ],
    favouriteRoutes: [
        { number: '4', name: 'University / Downtown' },
        { number: '16', name: 'Rochdale / South Albert' },
    ],
    lastLogin: '2026-02-19 09:15 AM',
    activeSessions: 2,
};

/* ------------------------------------------------------------------ */
/*  Toggle Switch                                                      */
/* ------------------------------------------------------------------ */
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${enabled ? 'bg-transit-800' : 'bg-gray-200'}`}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
            />
        </button>
    );
}

/* ------------------------------------------------------------------ */
/*  Section Card wrapper                                               */
/* ------------------------------------------------------------------ */
function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                <Icon className="w-4 h-4 text-transit-800" />
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            </div>
            <div className="px-5 py-4">{children}</div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Info Row                                                           */
/* ------------------------------------------------------------------ */
function InfoRow({ label, value, verified }: { label: string; value: string; verified?: boolean }) {
    return (
        <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">{label}</span>
            <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-gray-900">{value}</span>
                {verified && <CheckCircle2 className="w-3.5 h-3.5 text-transit-600" />}
            </div>
        </div>
    );
}

/* ================================================================== */
/*  Profile Page                                                       */
/* ================================================================== */
export default function ProfilePage() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [notifAlerts, setNotifAlerts] = useState(true);
    const [notifDelays, setNotifDelays] = useState(true);
    const [notifPromos, setNotifPromos] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
    const [largerText, setLargerText] = useState(false);
    const [highContrast, setHighContrast] = useState(false);

    const initials = SAMPLE.fullName.split(' ').map((n) => n[0]).join('').toUpperCase();

    const themes: { value: typeof theme; icon: React.ElementType; label: string }[] = [
        { value: 'light', icon: Sun, label: 'Light' },
        { value: 'dark', icon: Moon, label: 'Dark' },
        { value: 'system', icon: Monitor, label: 'System' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* ---- Top bar ------------------------------------------- */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
                <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
                    <Link to="/" className="inline-flex items-center gap-2">
                        <img src={logo} alt="GoTransit Regina" className="w-8 h-8 rounded-lg object-cover" />
                        <span className="font-bold text-gray-900">GoTransit Regina</span>
                    </Link>
                    <Link to="/map" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition">
                        <ArrowLeft className="w-4 h-4" /> Back to Map
                    </Link>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="max-w-lg mx-auto px-4 pb-16 pt-6 space-y-4"
            >
                {/* ============================================================ */}
                {/*  HEADER                                                       */}
                {/* ============================================================ */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-6 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-transit-800 flex items-center justify-center text-white text-xl font-bold shrink-0 select-none">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-gray-900 truncate">{SAMPLE.fullName}</h2>
                        <p className="text-sm text-gray-500 truncate">{SAMPLE.email}</p>
                    </div>
                    <button className="flex items-center gap-1 text-sm font-medium text-transit-800 hover:text-transit-900 bg-transit-50 hover:bg-transit-100 px-3 py-1.5 rounded-lg transition">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                </div>

                {/* ============================================================ */}
                {/*  PERSONAL INFO                                                */}
                {/* ============================================================ */}
                <SectionCard title="Personal Info" icon={Eye}>
                    <InfoRow label="Full Name" value={SAMPLE.fullName} />
                    <InfoRow label="Email" value={SAMPLE.email} verified={SAMPLE.emailVerified} />
                    <InfoRow label="Phone" value={SAMPLE.phone} verified={SAMPLE.phoneVerified} />
                </SectionCard>

                {/* ============================================================ */}
                {/*  TRANSIT PREFERENCES                                          */}
                {/* ============================================================ */}
                <SectionCard title="Transit Preferences" icon={MapPin}>
                    {/* Home stop */}
                    <div className="mb-4">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Home Stop</label>
                        <div className="mt-1 flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                            <MapPin className="w-4 h-4 text-transit-700 shrink-0" />
                            <span className="text-sm text-gray-900">{SAMPLE.homeStop}</span>
                        </div>
                    </div>

                    {/* Favourite Stops */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Favourite Stops</label>
                            <span className="text-xs text-gray-400">{SAMPLE.favouriteStops.length}/5</span>
                        </div>
                        <div className="space-y-2">
                            {SAMPLE.favouriteStops.map((stop) => (
                                <div key={stop.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Star className="w-3.5 h-3.5 text-yellow-500" />
                                        <span className="text-sm text-gray-900">{stop.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-transit-50 text-transit-800 px-2 py-0.5 rounded-full font-medium">{stop.label}</span>
                                        <button className="text-gray-300 hover:text-red-400 transition">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {SAMPLE.favouriteStops.length < 5 && (
                                <button className="flex items-center gap-1.5 text-sm text-transit-800 hover:text-transit-900 font-medium transition">
                                    <Plus className="w-4 h-4" /> Add stop
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Favourite Routes */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Favourite Routes</label>
                        <div className="space-y-2">
                            {SAMPLE.favouriteRoutes.map((route) => (
                                <div key={route.number} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <RouteIcon className="w-3.5 h-3.5 text-transit-700" />
                                        <span className="text-sm font-semibold text-transit-800">#{route.number}</span>
                                        <span className="text-sm text-gray-600">{route.name}</span>
                                    </div>
                                    <button className="text-gray-300 hover:text-red-400 transition">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            <button className="flex items-center gap-1.5 text-sm text-transit-800 hover:text-transit-900 font-medium transition">
                                <Plus className="w-4 h-4" /> Add route
                            </button>
                        </div>
                    </div>
                </SectionCard>

                {/* ============================================================ */}
                {/*  NOTIFICATIONS                                                */}
                {/* ============================================================ */}
                <SectionCard title="Notifications" icon={Bell}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900">Service Alerts</p>
                                <p className="text-xs text-gray-500">Route changes, detours & cancellations</p>
                            </div>
                            <Toggle enabled={notifAlerts} onChange={setNotifAlerts} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900">Delays</p>
                                <p className="text-xs text-gray-500">Real-time delay notifications</p>
                            </div>
                            <Toggle enabled={notifDelays} onChange={setNotifDelays} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900">Promotions</p>
                                <p className="text-xs text-gray-500">Deals, news & GoTransit updates</p>
                            </div>
                            <Toggle enabled={notifPromos} onChange={setNotifPromos} />
                        </div>
                    </div>
                </SectionCard>

                {/* ============================================================ */}
                {/*  APPEARANCE                                                   */}
                {/* ============================================================ */}
                <SectionCard title="Appearance" icon={Sun}>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Theme</label>
                    <div className="inline-flex bg-gray-100 rounded-lg p-0.5 w-full">
                        {themes.map((t) => (
                            <button
                                key={t.value}
                                onClick={() => setTheme(t.value)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all duration-200 ${theme === t.value
                                    ? 'bg-white text-transit-800 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <t.icon className="w-4 h-4" /> {t.label}
                            </button>
                        ))}
                    </div>
                </SectionCard>

                {/* ============================================================ */}
                {/*  ACCESSIBILITY                                                */}
                {/* ============================================================ */}
                <SectionCard title="Accessibility" icon={Type}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900">Larger Text</p>
                                <p className="text-xs text-gray-500">Increase text size throughout the app</p>
                            </div>
                            <Toggle enabled={largerText} onChange={setLargerText} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900">High Contrast</p>
                                <p className="text-xs text-gray-500">Improve colour contrast for readability</p>
                            </div>
                            <Toggle enabled={highContrast} onChange={setHighContrast} />
                        </div>
                    </div>
                </SectionCard>

                {/* ============================================================ */}
                {/*  SECURITY                                                     */}
                {/* ============================================================ */}
                <SectionCard title="Security" icon={Shield}>
                    <div className="space-y-3">
                        <button className="w-full flex items-center justify-between py-2 text-sm text-gray-900 hover:text-transit-800 transition group">
                            <span className="font-medium">Change Password</span>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-transit-800 transition" />
                        </button>
                        <div className="border-t border-gray-50" />
                        <button className="w-full flex items-center justify-between py-2 text-sm text-gray-900 hover:text-transit-800 transition group">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Active Sessions</span>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{SAMPLE.activeSessions}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-transit-800 transition" />
                        </button>
                        <div className="border-t border-gray-50" />
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-500">Last Login</span>
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                <Clock className="w-3.5 h-3.5" />
                                {SAMPLE.lastLogin}
                            </div>
                        </div>
                    </div>
                </SectionCard>

                {/* ============================================================ */}
                {/*  ACCOUNT                                                      */}
                {/* ============================================================ */}
                <div className="space-y-3 pb-4">
                    <button
                        onClick={() => { logout(); navigate('/login'); }}
                        className="w-full flex items-center justify-center gap-2 text-red-600 border border-red-200 hover:bg-red-50 py-2.5 rounded-xl font-medium text-sm transition"
                    >
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                    <button className="w-full text-center text-sm text-red-400 hover:text-red-600 transition font-medium">
                        <span className="inline-flex items-center gap-1">
                            <Trash2 className="w-3.5 h-3.5" /> Delete Account
                        </span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
