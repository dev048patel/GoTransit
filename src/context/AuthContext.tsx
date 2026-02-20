/**
 * AuthContext.tsx — GoTransit Regina
 *
 * React Context that wraps the entire app to provide auth state globally.
 * This is the bridge between the Controller (useAuthController) and all Views.
 *
 * Usage:
 *   const { isAuthenticated, user, login, logout } = useAuth();
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, AuthSession } from '../models/auth/AuthModel';
import { loadSession, saveSession, clearSession, SESSION_TTL_MS } from '../models/auth/AuthModel';
import { recordLogin, recordLogout } from '../services/UserRegistry';

/* ── Shape of what the context exposes ───────────────────────── */
interface AuthContextValue {
    isAuthenticated: boolean;
    user: User | null;
    /** Simulates a login; stores session in localStorage. Returns true on success. */
    login: (email: string, password: string, fullName?: string) => Promise<boolean>;
    /** Clears the session and resets auth state. */
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ── Provider ─────────────────────────────────────────────────── */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Boot from persisted session so a page refresh keeps the user logged in
    const [session, setSession] = useState<AuthSession | null>(() => loadSession());

    // Keep auth state in sync if localStorage changes in another tab
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === 'gotransit_session') {
                setSession(loadSession());
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    /**
     * login() — mock login until backend is connected.
     * Accepts any non-empty email + password (≥6 chars) and stores a session.
     */
    const login = useCallback(async (email: string, password: string, fullName: string = 'User'): Promise<boolean> => {
        // TODO: replace with real API call
        if (!email || password.length < 6) return false;

        const newSession: AuthSession = {
            user: { fullName, email },
            token: `mock-token-${Date.now()}`,
            expiresAt: Date.now() + SESSION_TTL_MS,
        };
        saveSession(newSession);
        setSession(newSession);

        // Record login event → visible in admin panel + persisted to PostgreSQL
        await recordLogin(email, fullName);

        return true;
    }, []);

    const logout = useCallback(() => {
        // Record logout event → visible in browser console
        const email = session?.user?.email ?? 'unknown';
        clearSession();
        setSession(null);
        recordLogout(email);
    }, [session]);

    const value: AuthContextValue = {
        isAuthenticated: session !== null,
        user: session?.user ?? null,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ── Hook ─────────────────────────────────────────────────────── */
/** Must be used inside <AuthProvider>. Throws if used outside. */
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
}
