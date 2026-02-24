/**
 * useProfileController.ts — GoTransit Regina
 *
 * Controller for the Profile page.
 * Loads data from Supabase (profiles, user_preferences, favourite_stops,
 * favourite_routes) and provides handlers for all profile mutations.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

/* ── Types ──────────────────────────────────────────────────────── */
export interface ProfileData {
    full_name: string;
    mobile_number: string | null;
    mobile_verified: boolean;
    account_status: string;
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
    const { user, logout } = useAuth();

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
    const [isLoading, setIsLoading] = useState(true);

    // Change password modal
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Delete account confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    /* ── Load all profile data on mount ────────────────────────── */
    useEffect(() => {
        loadAll();
    }, []);

    async function loadAll() {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setIsLoading(false); return; }

        const uid = session.user.id;

        // Format last login from the session
        if (session.user.last_sign_in_at) {
            setLastLogin(new Date(session.user.last_sign_in_at).toLocaleString('en-CA', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            }));
        }

        const [profileRes, prefsRes, stopsRes, routesRes] = await Promise.all([
            supabase.from('profiles')
                .select('full_name, mobile_number, mobile_verified, account_status')
                .eq('id', uid).single(),
            supabase.from('user_preferences')
                .select('theme, larger_text, high_contrast, notif_alerts, notif_delays, notif_promos')
                .eq('id', uid).single(),
            supabase.from('favourite_stops')
                .select('id, stop_id, stop_name, label')
                .eq('user_id', uid).order('created_at'),
            supabase.from('favourite_routes')
                .select('id, route_number, route_name')
                .eq('user_id', uid).order('created_at'),
        ]);

        if (profileRes.data) setProfile(profileRes.data);
        if (prefsRes.data) setPrefs(prefsRes.data as Preferences);
        if (stopsRes.data) setFavStops(stopsRes.data);
        if (routesRes.data) setFavRoutes(routesRes.data);

        setIsLoading(false);
    }

    /* ── Logout ─────────────────────────────────────────────────── */
    // Just call logout() — ProtectedRoute detects isAuthenticated=false
    // and redirects to /login automatically. No navigate() needed.
    const handleLogout = useCallback(async () => {
        await logout();
    }, [logout]);

    /* ── Preferences ────────────────────────────────────────────── */
    const updatePref = useCallback(async <K extends keyof Preferences>(
        key: K, value: Preferences[K]
    ) => {
        setPrefs(prev => ({ ...prev, [key]: value }));
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await supabase.from('user_preferences')
            .update({ [key]: value, updated_at: new Date().toISOString() })
            .eq('id', session.user.id);
    }, []);

    /* ── Change Password ────────────────────────────────────────── */
    const handleChangePassword = useCallback(async () => {
        setPasswordError('');
        if (newPassword.length < 8) {
            setPasswordError('Minimum 8 characters required');
            return;
        }
        setPasswordLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setPasswordLoading(false);
        if (error) {
            setPasswordError(error.message);
        } else {
            setPasswordSuccess(true);
            setNewPassword('');
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordSuccess(false);
            }, 1500);
        }
    }, [newPassword]);

    const closePasswordModal = useCallback(() => {
        setShowPasswordModal(false);
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

    /* ── Delete Account ─────────────────────────────────────────── */
    const handleDeleteAccount = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            // Soft-delete: mark as deleted, then sign out
            await supabase.from('profiles')
                .update({ account_status: 'deleted', updated_at: new Date().toISOString() })
                .eq('id', session.user.id);
        }
        await logout();
    }, [logout]);

    return {
        user,
        profile,
        prefs,
        favStops,
        favRoutes,
        lastLogin,
        isLoading,
        // Password modal
        showPasswordModal, setShowPasswordModal,
        newPassword, setNewPassword,
        passwordError,
        passwordSuccess,
        passwordLoading,
        handleChangePassword,
        closePasswordModal,
        // Delete confirm
        showDeleteConfirm, setShowDeleteConfirm,
        handleDeleteAccount,
        // Actions
        handleLogout,
        updatePref,
        removeFavStop,
        removeFavRoute,
    };
}
