/**
 * AuthContext.tsx — Transit Regina
 *
 * React Context that wraps the entire app to provide auth state globally.
 * Session management is handled by Supabase Auth.
 *
 * Role (user | admin) is fetched from the public.profiles table after login.
 * Changing a user's role in the Supabase dashboard takes effect on the next
 * page load — no re-login required.
 *
 * Usage:
 *   const { isAuthenticated, isAdmin, user, login, logout } = useAuth();
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User } from '../auth/AuthModel';
import { recordLogout } from '../services/UserRegistry';
import { formatMobile } from '../services/AuthService';
import { apiPost } from '../lib/apiClient';

interface AuthContextValue {
    isAuthenticated: boolean;
    /** True only when the authenticated user has role = 'admin' in profiles. */
    isAdmin: boolean;
    /** False until the role has been read from the database; admin pages wait for it. */
    roleLoaded: boolean;
    /** True when this login has passed two-step sign-in (the authenticator-app code). */
    twoStepPassed: boolean;
    /** Null while session is loading; populated once auth state is known. */
    user: User | null;
    /** True until the initial session + role fetch completes — prevents flash redirects. */
    isLoading: boolean;
    /** Returns null on success, or an error message string on failure. */
    login: (identifier: string, password: string) => Promise<string | null>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Supabase marks a login that passed the second step with aal2 inside the session token. */
function tokenPassedTwoStep(token: string): boolean {
    try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aal === 'aal2'; }
    catch { return false; }
}

async function fetchRole(userId: string): Promise<'user' | 'admin'> {
    const { data } = await supabase
        .from('profiles')
        .select('role, account_status')
        .eq('id', userId)
        .single();
    // Sessions created outside login() (e.g. password-reset links) must not
    // let suspended or soft-deleted accounts in.
    if (data?.account_status === 'suspended' || data?.account_status === 'deleted') {
        await supabase.auth.signOut();
    }
    return (data?.role === 'admin') ? 'admin' : 'user';
}

function sessionToUser(session: Session, role: 'user' | 'admin'): User {
    return {
        id: session.user.id,
        fullName: session.user.user_metadata?.full_name ?? session.user.email ?? 'User',
        email: session.user.email ?? '',
        mobile: session.user.user_metadata?.mobile_number ?? undefined,
        role,
    };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<'user' | 'admin'>('user');
    const [isLoading, setIsLoading] = useState(true);
    // Which user the loaded role belongs to. Comparing it with the session means a role left over
    // from "nobody signed in" is never mistaken for the role of the person who just appeared.
    const [roleFor, setRoleFor] = useState<string | null>(null);
    const initializedRef = useRef(false);

    // Listen for auth changes — ONLY synchronous state updates here.
    // Making async Supabase calls inside onAuthStateChange can deadlock
    // due to the internal auth lock in Supabase JS v2.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);

            if (!initializedRef.current) {
                initializedRef.current = true;
                setIsLoading(false);
            }
        });

        const timeout = setTimeout(() => {
            if (!initializedRef.current) {
                initializedRef.current = true;
                setIsLoading(false);
            }
        }, 3000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    // Fetch role in a separate effect — safe to call Supabase here.
    useEffect(() => {
        if (session) {
            const uid = session.user.id;
            fetchRole(uid)
                .then(r => setRole(r))
                .catch(() => setRole('user'))
                .finally(() => setRoleFor(uid));
        } else {
            setRole('user');
            setRoleFor(null);
        }
    }, [session?.user?.id]);

    const login = useCallback(async (identifier: string, password: string): Promise<string | null> => {
        let email = identifier.trim();

        // A mobile number is signed in by the backend, which hands back the session. The browser
        // never learns which email the number belongs to, and every failure reads the same.
        let signedIn;
        if (/^\+?\d/.test(email)) {
            let tokens: { access_token: string; refresh_token: string };
            try {
                tokens = await (await apiPost('/api/auth/login-mobile', { mobile: formatMobile(email), password })).json();
            } catch (e) {
                return (e as { status?: number }).status === 401 ? 'Invalid credentials. Please try again.' : 'Mobile login is not available right now. Please use your email.';
            }
            signedIn = await supabase.auth.setSession(tokens);
        } else {
            signedIn = await supabase.auth.signInWithPassword({ email, password });
        }
        const { error, data } = signedIn;
        if (error || !data.user) return 'Invalid credentials. Please try again.';

        // Block suspended or soft-deleted accounts from logging in
        const { data: profile } = await supabase
            .from('profiles')
            .select('account_status')
            .eq('id', data.user.id)
            .single();

        if (profile?.account_status === 'suspended' || profile?.account_status === 'deleted') {
            await supabase.auth.signOut();
            return 'This account has been deactivated.';
        }

        return null;
    }, []);

    const logout = useCallback(async () => {
        const email = session?.user?.email ?? 'unknown';
        await supabase.auth.signOut();
        setRole('user');
        recordLogout(email);
    }, [session]);

    const user = session ? sessionToUser(session, role) : null;


    return (
        <AuthContext.Provider value={{
            isAuthenticated: !!session,
            isAdmin: role === 'admin',
            roleLoaded: !session || roleFor === session.user.id,
            twoStepPassed: !!session && tokenPassedTwoStep(session.access_token),
            user,
            isLoading,
            login,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
}
