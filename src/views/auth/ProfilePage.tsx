/**
 * ProfilePage.tsx — GoTransit Regina user profile
 *
 * All data and logic lives in useProfileController.
 * Sections:
 *   Header        – Avatar, full name, email
 *   Personal Info  – Name, email (verified), phone, change password
 *   Transit Prefs  – Favourite stops (removable), favourite routes (removable)
 *   Account        – Logout, delete account (with confirmation)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {

    LogOut, Trash2, CheckCircle2, Pencil,
    Eye,
    ArrowLeft, KeyRound,
} from 'lucide-react';
import logo from '../../New-Image.jpeg';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileController } from '../../controllers/auth/useProfileController';



/* ── Section Card ───────────────────────────────────────────────── */
function SectionCard({ title, icon: Icon, children, action }: {
    title: string; icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                <Icon className="w-4 h-4 text-[#003DA5]" />
                <h3 className="text-sm font-semibold text-gray-900 flex-1">{title}</h3>
                {action}
            </div>
            <div className="px-5 py-4">{children}</div>
        </div>
    );
}

/* ── Skeleton shimmer for loading fields ──────────────────────── */
function Shimmer({ width = 'w-24' }: { width?: string }) {
    return (
        <div className={`${width} h-4 rounded-md bg-gray-100 animate-pulse`} />
    );
}

/* ── Info Row ───────────────────────────────────────────────────── */
function InfoRow({ label, value, verified, loading }: { label: string; value: string; verified?: boolean; loading?: boolean }) {
    return (
        <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">{label}</span>
            <div className="flex items-center gap-1.5">
                {loading ? <Shimmer width="w-28" /> : (
                    <>
                        <span className="text-sm font-medium text-gray-900">{value}</span>
                        {verified && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                    </>
                )}
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
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-center">
                        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                        <p className="text-green-700 font-semibold text-base">Hey, your password has been changed!</p>
                        <p className="text-green-600 text-xs mt-1">You can now use your new password to log in.</p>
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
function DeleteConfirm({ onConfirm, onCancel, loading, error }: { onConfirm: () => void; onCancel: () => void; loading: boolean; error?: string }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={loading ? undefined : onCancel} />
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
                {error && (
                    <p className="text-sm text-red-500 text-center mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition disabled:opacity-60"
                    >
                        {loading ? 'Deleting…' : 'Delete'}
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
        user, profile,
        profileLoading,
        showPasswordModal, setShowPasswordModal,
        newPassword, setNewPassword,
        passwordError, passwordSuccess, passwordLoading,
        handleChangePassword, closePasswordModal,
        isEditingProfile,
        editName, setEditName,
        editEmail, setEditEmail,
        editMobile, setEditMobile,
        editLoading, editError, editEmailSent,
        startEditProfile, cancelEditProfile, saveProfile,
        showDeleteConfirm, setShowDeleteConfirm,
        deleteLoading, deleteError,
        handleDeleteAccount,
        handleLogout,
    } = useProfileController();

    const fullName = profile?.full_name ?? user?.fullName ?? '—';
    const email = user?.email ?? '—';
    const phone = profile?.mobile_number ?? user?.mobile ?? null;
    const initials = fullName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

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
                        error={deleteError}
                        loading={deleteLoading}
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

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
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
                <SectionCard
                    title="Personal Info"
                    icon={Eye}
                    action={
                        !isEditingProfile ? (
                            <button
                                onClick={startEditProfile}
                                className="flex items-center gap-1 text-xs font-medium text-[#003DA5] hover:text-[#002d7a] transition"
                            >
                                <Pencil className="w-3 h-3" /> Edit
                            </button>
                        ) : undefined
                    }
                >
                    {isEditingProfile ? (
                        <div className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Full Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    placeholder="Jane Doe"
                                    autoFocus
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5] transition"
                                />
                            </div>
                            {/* Email */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Email</label>
                                <input
                                    type="email"
                                    value={editEmail}
                                    onChange={e => setEditEmail(e.target.value)}
                                    placeholder="jane@example.com"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5] transition"
                                />
                                <p className="text-xs text-gray-400 mt-1">Changing email sends a confirmation link to the new address.</p>
                            </div>
                            {/* Mobile */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                                    Mobile <span className="normal-case font-normal text-gray-400">(optional)</span>
                                </label>
                                <input
                                    type="tel"
                                    value={editMobile}
                                    onChange={e => setEditMobile(e.target.value)}
                                    placeholder="+1 306-555-0199"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5] transition"
                                />
                            </div>
                            {/* Error */}
                            {editError && (
                                <p className="text-red-500 text-xs">{editError}</p>
                            )}
                            {/* Email confirmation notice */}
                            {editEmailSent && (
                                <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs rounded-xl px-3 py-2.5">
                                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>Confirmation link sent to <strong>{editEmail}</strong>. Check your inbox to finalize the email change.</span>
                                </div>
                            )}
                            {/* Save / Cancel */}
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={cancelEditProfile}
                                    disabled={editLoading}
                                    className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                                >
                                    {editEmailSent ? 'Done' : 'Cancel'}
                                </button>
                                {!editEmailSent && (
                                    <button
                                        onClick={saveProfile}
                                        disabled={editLoading}
                                        className="flex-1 py-2 rounded-xl bg-[#003DA5] text-white text-sm font-medium hover:bg-[#002d7a] transition disabled:opacity-60"
                                    >
                                        {editLoading ? 'Saving…' : 'Save'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <InfoRow label="Full Name" value={fullName} />
                            <InfoRow label="Email" value={email} verified />
                            <InfoRow
                                label="Phone"
                                value={phone ?? 'Not set'}
                                verified={profile?.mobile_verified}
                                loading={profileLoading && !profile}
                            />
                        </>
                    )}
                </SectionCard>




                {/* ACCOUNT */}
                <div className="space-y-3 pb-4">
                    <button
                        onClick={() => setShowPasswordModal(true)}
                        className="w-full flex items-center justify-center gap-2 text-[#003DA5] border border-[#003DA5]/20 hover:bg-[#003DA5]/5 py-2.5 rounded-xl font-medium text-sm transition"
                    >
                        <KeyRound className="w-4 h-4" /> Change Password
                    </button>
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
        </div>
    );
}
