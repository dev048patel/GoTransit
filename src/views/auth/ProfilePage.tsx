/**
 * ProfilePage.tsx — GoTransit Regina user profile
 *
 * All data and logic lives in useProfileController.
 * Sections:
 *   Header        – Avatar, full name, email
 *   Personal Info  – Name, email (verified), phone
 *   Transit Prefs  – Favourite stops (removable), favourite routes (removable)
 *   Notifications  – Toggles persisted to user_preferences
 *   Appearance     – Theme persisted to user_preferences
 *   Accessibility  – Larger text, high-contrast persisted to user_preferences
 *   Security       – Change password (modal), last login
 *   Account        – Logout, delete account (with confirmation)
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    MapPin, Star, Bell, Sun, Moon, Monitor,
    Shield, LogOut, Trash2, Pencil, CheckCircle2,
    ChevronRight, Eye, Type, Clock,
    Route as RouteIcon, X, ArrowLeft, KeyRound,
} from 'lucide-react';
import logo from '../../image.jpg';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileController } from '../../controllers/auth/useProfileController';

/* ── Toggle Switch ──────────────────────────────────────────────── */
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${enabled ? 'bg-[#003DA5]' : 'bg-gray-200'}`}
        >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    );
}

/* ── Section Card ───────────────────────────────────────────────── */
function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                <Icon className="w-4 h-4 text-[#003DA5]" />
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            </div>
            <div className="px-5 py-4">{children}</div>
        </div>
    );
}

/* ── Info Row ───────────────────────────────────────────────────── */
function InfoRow({ label, value, verified }: { label: string; value: string; verified?: boolean }) {
    return (
        <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">{label}</span>
            <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-gray-900">{value}</span>
                {verified && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
            </div>
        </div>
    );
}

/* ── Change Password Modal ──────────────────────────────────────── */
function PasswordModal({
    newPassword, setNewPassword,
    error, success, loading,
    onSubmit, onClose,
}: {
    newPassword: string; setNewPassword: (v: string) => void;
    error: string; success: boolean; loading: boolean;
    onSubmit: () => void; onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10"
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-[#003DA5]/10 flex items-center justify-center">
                        <KeyRound className="w-5 h-5 text-[#003DA5]" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
                </div>

                {success ? (
                    <div className="flex items-center gap-2 text-green-600 font-medium py-2">
                        <CheckCircle2 className="w-5 h-5" /> Password updated!
                    </div>
                ) : (
                    <>
                        <input
                            type="password"
                            placeholder="New password (min. 8 characters)"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && onSubmit()}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5] mb-3"
                            autoFocus
                        />
                        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onSubmit}
                                disabled={loading}
                                className="flex-1 py-2.5 rounded-xl bg-[#003DA5] text-white text-sm font-medium hover:bg-[#002d7a] transition disabled:opacity-60"
                            >
                                {loading ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}

/* ── Delete Confirmation ────────────────────────────────────────── */
function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10"
            >
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Account?</h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                    This will permanently remove your account and all saved data. This cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition"
                    >
                        Delete
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

/* ================================================================== */
/*  Profile Page                                                        */
/* ================================================================== */
export default function ProfilePage() {
    const {
        user, profile, prefs, favStops, favRoutes, lastLogin, isLoading,
        showPasswordModal, setShowPasswordModal,
        newPassword, setNewPassword,
        passwordError, passwordSuccess, passwordLoading,
        handleChangePassword, closePasswordModal,
        showDeleteConfirm, setShowDeleteConfirm,
        handleDeleteAccount,
        handleLogout,
        updatePref,
        removeFavStop, removeFavRoute,
    } = useProfileController();

    const fullName = profile?.full_name ?? user?.fullName ?? '—';
    const email = user?.email ?? '—';
    const phone = profile?.mobile_number ?? user?.mobile ?? null;
    const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const themes: { value: 'light' | 'dark' | 'system'; icon: React.ElementType; label: string }[] = [
        { value: 'light', icon: Sun, label: 'Light' },
        { value: 'dark', icon: Moon, label: 'Dark' },
        { value: 'system', icon: Monitor, label: 'System' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Modals */}
            <AnimatePresence>
                {showPasswordModal && (
                    <PasswordModal
                        newPassword={newPassword} setNewPassword={setNewPassword}
                        error={passwordError} success={passwordSuccess} loading={passwordLoading}
                        onSubmit={handleChangePassword} onClose={closePasswordModal}
                    />
                )}
                {showDeleteConfirm && (
                    <DeleteConfirm
                        onConfirm={handleDeleteAccount}
                        onCancel={() => setShowDeleteConfirm(false)}
                    />
                )}
            </AnimatePresence>

            {/* Top bar */}
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

            {isLoading ? (
                <div className="flex items-center justify-center py-24">
                    <div className="w-8 h-8 border-4 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-lg mx-auto px-4 pb-16 pt-6 space-y-4"
                >
                    {/* HEADER */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-6 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-[#003DA5] flex items-center justify-center text-white text-xl font-bold shrink-0 select-none">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-gray-900 truncate">{fullName}</h2>
                            <p className="text-sm text-gray-500 truncate">{email}</p>
                        </div>
                    </div>

                    {/* PERSONAL INFO */}
                    <SectionCard title="Personal Info" icon={Eye}>
                        <InfoRow label="Full Name" value={fullName} />
                        <InfoRow label="Email" value={email} verified />
                        <InfoRow
                            label="Phone"
                            value={phone ?? 'Not set'}
                            verified={profile?.mobile_verified}
                        />
                    </SectionCard>

                    {/* TRANSIT PREFERENCES */}
                    <SectionCard title="Transit Preferences" icon={MapPin}>
                        {/* Favourite Stops */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Favourite Stops</label>
                                <span className="text-xs text-gray-400">{favStops.length}/5</span>
                            </div>
                            {favStops.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">No favourite stops saved yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {favStops.map(stop => (
                                        <div key={stop.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Star className="w-3.5 h-3.5 text-yellow-500" />
                                                <span className="text-sm text-gray-900">{stop.stop_name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {stop.label && (
                                                    <span className="text-xs bg-blue-50 text-[#003DA5] px-2 py-0.5 rounded-full font-medium">{stop.label}</span>
                                                )}
                                                <button
                                                    onClick={() => removeFavStop(stop.id)}
                                                    className="text-gray-300 hover:text-red-400 transition"
                                                    aria-label="Remove stop"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Favourite Routes */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Favourite Routes</label>
                            {favRoutes.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">No favourite routes saved yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {favRoutes.map(route => (
                                        <div key={route.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <RouteIcon className="w-3.5 h-3.5 text-[#003DA5]" />
                                                <span className="text-sm font-semibold text-[#003DA5]">#{route.route_number}</span>
                                                <span className="text-sm text-gray-600">{route.route_name}</span>
                                            </div>
                                            <button
                                                onClick={() => removeFavRoute(route.id)}
                                                className="text-gray-300 hover:text-red-400 transition"
                                                aria-label="Remove route"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    {/* NOTIFICATIONS */}
                    <SectionCard title="Notifications" icon={Bell}>
                        <div className="space-y-4">
                            {[
                                { key: 'notif_alerts' as const, label: 'Service Alerts', desc: 'Route changes, detours & cancellations' },
                                { key: 'notif_delays' as const, label: 'Delays', desc: 'Real-time delay notifications' },
                                { key: 'notif_promos' as const, label: 'Promotions', desc: 'Deals, news & GoTransit updates' },
                            ].map(({ key, label, desc }) => (
                                <div key={key} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{label}</p>
                                        <p className="text-xs text-gray-500">{desc}</p>
                                    </div>
                                    <Toggle
                                        enabled={prefs[key]}
                                        onChange={v => updatePref(key, v)}
                                    />
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    {/* APPEARANCE */}
                    <SectionCard title="Appearance" icon={Sun}>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Theme</label>
                        <div className="inline-flex bg-gray-100 rounded-lg p-0.5 w-full">
                            {themes.map(t => (
                                <button
                                    key={t.value}
                                    onClick={() => updatePref('theme', t.value)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all duration-200 ${prefs.theme === t.value ? 'bg-white text-[#003DA5] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <t.icon className="w-4 h-4" /> {t.label}
                                </button>
                            ))}
                        </div>
                    </SectionCard>

                    {/* ACCESSIBILITY */}
                    <SectionCard title="Accessibility" icon={Type}>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Larger Text</p>
                                    <p className="text-xs text-gray-500">Increase text size throughout the app</p>
                                </div>
                                <Toggle enabled={prefs.larger_text} onChange={v => updatePref('larger_text', v)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">High Contrast</p>
                                    <p className="text-xs text-gray-500">Improve colour contrast for readability</p>
                                </div>
                                <Toggle enabled={prefs.high_contrast} onChange={v => updatePref('high_contrast', v)} />
                            </div>
                        </div>
                    </SectionCard>

                    {/* SECURITY */}
                    <SectionCard title="Security" icon={Shield}>
                        <div className="space-y-3">
                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className="w-full flex items-center justify-between py-2 text-sm text-gray-900 hover:text-[#003DA5] transition group"
                            >
                                <span className="font-medium">Change Password</span>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#003DA5] transition" />
                            </button>
                            {lastLogin && (
                                <>
                                    <div className="border-t border-gray-50" />
                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-sm text-gray-500">Last Login</span>
                                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                            <Clock className="w-3.5 h-3.5" />
                                            {lastLogin}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </SectionCard>

                    {/* ACCOUNT */}
                    <div className="space-y-3 pb-4">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 text-red-600 border border-red-200 hover:bg-red-50 py-2.5 rounded-xl font-medium text-sm transition"
                        >
                            <LogOut className="w-4 h-4" /> Logout
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full text-center text-sm text-red-400 hover:text-red-600 transition font-medium"
                        >
                            <span className="inline-flex items-center gap-1">
                                <Trash2 className="w-3.5 h-3.5" /> Delete Account
                            </span>
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
