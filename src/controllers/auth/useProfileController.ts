/**
 * useProfileController.ts — Transit Regina
 *
 * Controller for the Profile page.
 * Loads data from Supabase (profiles, user_preferences, favourite_stops,
 * favourite_routes) and provides handlers for all profile mutations.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../models/lib/supabase';
import { useAuth } from '../../models/context/AuthContext';
import { useFeatureAccess } from '../../models/context/FeatureAccessContext';
import { formatMobile, deleteAccount, changePassword } from '../../models/services/AuthService';
import { SmsService } from '../../models/services/SmsService';

/* ── Types ──────────────────────────────────────────────────────── */
export interface ProfileData {
    full_name: string;
    mobile_number: string | null;
    mobile_verified: boolean;
    account_status: string;
    sms_opted_in: boolean;
    sms_consent_at: string | null;
}

export interface Preferences {
    theme: 'light' | 'dark' | 'system';
    larger_text: boolean;
    high_contrast: boolean;
    notif_alerts: boolean;
    notif_delays: boolean;
    notif_promos: boolean;
}

export interface FavStop {
    id: string;
    stop_id: string;
    stop_name: string;
    label: string | null;
}

export interface FavRoute {
    id: string;
    route_number: string;
    route_name: string;
}

/* ── Controller ─────────────────────────────────────────────────── */
export function useProfileController() {
    const { user, logout, logoutEverywhere } = useAuth();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [prefs, setPrefs] = useState<Preferences>({
        theme: 'system',
        larger_text: false,
        high_contrast: false,
        notif_alerts: true,
        notif_delays: true,
        notif_promos: false,
    });
    const [favStops, setFavStops] = useState<FavStop[]>([]);
    const [favRoutes, setFavRoutes] = useState<FavRoute[]>([]);
    const [lastLogin, setLastLogin] = useState<string | null>(null);

    // Per-section loading flags — each resolves independently
    const [profileLoading, setProfileLoading] = useState(true);
    const [stopsLoading, setStopsLoading] = useState(true);
    const [routesLoading, setRoutesLoading] = useState(true);

    // Change password modal
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Edit personal info
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editMobile, setEditMobile] = useState('');
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');
    const [editEmailSent, setEditEmailSent] = useState(false);

    // Delete account confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [deletePassword, setDeletePassword] = useState('');

    // SMS notifications
    const { hasFeature } = useFeatureAccess();
    const [smsLoading, setSmsLoading] = useState(false);
    const [smsError, setSmsError] = useState('');

    /* ── Load all profile data when user is available ───────────── */
    useEffect(() => {
        if (!user) {
            setProfileLoading(false);
            setStopsLoading(false);
            setRoutesLoading(false);
            return;
        }

        const uid = user.id;

        // Fire all queries in parallel — each resolves its own loading flag
        (async () => {
            try {
                const { data } = await supabase.from('profiles')
                    .select('full_name, mobile_number, mobile_verified, account_status, sms_opted_in, sms_consent_at')
                    .eq('id', uid).single();
                if (data) setProfile(data as ProfileData);
            } finally { setProfileLoading(false); }
        })();

        (async () => {
            try {
                const { data } = await supabase.from('user_preferences')
                    .select('theme, larger_text, high_contrast, notif_alerts, notif_delays, notif_promos')
                    .eq('id', uid).single();
                if (data) setPrefs(data as Preferences);
            } finally { setProfileLoading(false); }
        })();

        (async () => {
            try {
                const { data } = await supabase.from('favourite_stops')
                    .select('id, stop_id, stop_name, label')
                    .eq('user_id', uid).order('created_at');
                if (data) setFavStops(data);
            } finally { setStopsLoading(false); }
        })();

        (async () => {
            try {
                const { data } = await supabase.from('favourite_routes')
                    .select('id, route_number, route_name')
                    .eq('user_id', uid).order('created_at');
                if (data) setFavRoutes(data);
            } finally { setRoutesLoading(false); }
        })();
    }, [user?.id]);

    /* ── Logout ─────────────────────────────────────────────────── */
    // Just call logout() — ProtectedRoute detects isAuthenticated=false
    // and redirects to /login automatically. No navigate() needed.
    const handleLogout = useCallback(async () => {
        await logout();
    }, [logout]);
    /* Ends the session on every device this account is signed in on */
    const handleLogoutEverywhere = useCallback(async () => {
        await logoutEverywhere();
    }, [logoutEverywhere]);

    /* ── Preferences ────────────────────────────────────────────── */
    const updatePref = useCallback(async <K extends keyof Preferences>(
        key: K, value: Preferences[K]
    ) => {
        if (!user) return;
        setPrefs(prev => ({ ...prev, [key]: value }));
        await supabase.from('user_preferences')
            .update({ [key]: value, updated_at: new Date().toISOString() })
            .eq('id', user.id);
    }, [user]);

    /* ── Change Password ────────────────────────────────────────── */
    const handleChangePassword = useCallback(async () => {
        setPasswordError('');
        if (newPassword.length < 8) {
            setPasswordError('Minimum 8 characters required');
            return;
        }
        if (!currentPassword) {
            setPasswordError('Enter your current password');
            return;
        }
        setPasswordLoading(true);
        // Re-checks the current password, sets the new one, and signs out every other device
        const error = await changePassword(currentPassword, newPassword);
        setPasswordLoading(false);
        if (error) {
            setPasswordError(error);
        } else {
            setPasswordSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordSuccess(false);
            }, 4000);
        }
    }, [currentPassword, newPassword]);

    const closePasswordModal = useCallback(() => {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setPasswordError('');
        setPasswordSuccess(false);
    }, []);

    /* ── Remove Favourites ──────────────────────────────────────── */
    const removeFavStop = useCallback(async (id: string) => {
        setFavStops(prev => prev.filter(s => s.id !== id));
        await supabase.from('favourite_stops').delete().eq('id', id);
    }, []);

    const removeFavRoute = useCallback(async (id: string) => {
        setFavRoutes(prev => prev.filter(r => r.id !== id));
        await supabase.from('favourite_routes').delete().eq('id', id);
    }, []);

    /* ── Edit Personal Info ─────────────────────────────────────── */
    const startEditProfile = useCallback(() => {
        setEditName(profile?.full_name ?? user?.fullName ?? '');
        setEditEmail(user?.email ?? '');
        setEditMobile(profile?.mobile_number ?? '');
        setEditError('');
        setEditEmailSent(false);
        setIsEditingProfile(true);
    }, [profile, user]);

    const cancelEditProfile = useCallback(() => {
        setIsEditingProfile(false);
        setEditError('');
        setEditEmailSent(false);
    }, []);

    const saveProfile = useCallback(async () => {
        if (!editName.trim()) {
            setEditError('Full name is required');
            return;
        }
        setEditError('');
        setEditLoading(true);
        try {
            if (!user) return;

            // Format mobile to canonical +1 XXX-XXX-XXXX before saving
            const formattedMobile = editMobile.trim() ? formatMobile(editMobile) : null;

            // Update name and mobile in profiles table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: editName.trim(),
                    mobile_number: formattedMobile,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);
            if (profileError) throw profileError;

            // Reflect changes in local state immediately
            setProfile(prev => prev
                ? { ...prev, full_name: editName.trim(), mobile_number: formattedMobile }
                : prev
            );

            // If email changed, trigger Supabase email update (sends confirmation)
            if (editEmail.trim() && editEmail.trim() !== user.email) {
                const { error: emailError } = await supabase.auth.updateUser({ email: editEmail.trim() });
                if (emailError) throw emailError;
                setEditEmailSent(true);
                // Don't close edit mode yet — show the "check email" notice
                return;
            }

            setIsEditingProfile(false);
        } catch (err: any) {
            setEditError(err?.message ?? 'Failed to save changes. Please try again.');
        } finally {
            setEditLoading(false);
        }
    }, [user, editName, editEmail, editMobile]);

    /* ── SMS Notifications ──────────────────────────────────────── */
    const handleSmsToggle = useCallback(async (enable: boolean) => {
        setSmsLoading(true);
        setSmsError('');
        try {
            if (enable) {
                await SmsService.optIn();
            } else {
                await SmsService.optOut();
            }
            setProfile(prev => prev ? {
                ...prev,
                sms_opted_in: enable,
                sms_consent_at: enable ? new Date().toISOString() : prev.sms_consent_at,
            } : prev);
        } catch (err: any) {
            setSmsError(err?.message ?? 'Failed to update SMS preference');
        } finally {
            setSmsLoading(false);
        }
    }, []);

    /* ── Delete Account ─────────────────────────────────────────── */
    const handleDeleteAccount = useCallback(async () => {
        setDeleteLoading(true);
        setDeleteError('');
        try {
            if (!user) return;

            if (!deletePassword) {
                setDeleteError('Enter your password to confirm');
                setDeleteLoading(false);
                return;
            }
            // Re-checks the password, deletes the account and all saved data on the server, then signs out
            const error = await deleteAccount(deletePassword);

            if (error) {
                setDeleteError(error);
                setDeleteLoading(false);
                return;
            }

            await logout();
        } catch (err: any) {
            console.error('[Profile] Failed to delete account:', err);
            setDeleteError(err?.message ?? 'Failed to delete account. Please try again.');
            setDeleteLoading(false);
        }
    }, [user, logout, deletePassword]);

    return {
        user,
        profile,
        prefs,
        favStops,
        favRoutes,
        lastLogin,
        profileLoading,
        stopsLoading,
        routesLoading,
        // Password modal
        showPasswordModal, setShowPasswordModal,
        currentPassword, setCurrentPassword,
        newPassword, setNewPassword,
        passwordError,
        passwordSuccess,
        passwordLoading,
        handleChangePassword,
        closePasswordModal,
        // Edit personal info
        isEditingProfile,
        editName, setEditName,
        editEmail, setEditEmail,
        editMobile, setEditMobile,
        editLoading, editError, editEmailSent,
        startEditProfile, cancelEditProfile, saveProfile,
        // Delete confirm
        showDeleteConfirm, setShowDeleteConfirm,
        deleteLoading, deleteError,
        deletePassword, setDeletePassword,
        handleDeleteAccount,
        // SMS notifications
        smsAllowed: hasFeature('sms_alerts'),
        smsLoading, smsError, handleSmsToggle,
        // Actions
        handleLogout,
        handleLogoutEverywhere,
        updatePref,
        removeFavStop,
        removeFavRoute,
    };
}
