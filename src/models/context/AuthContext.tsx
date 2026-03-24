/**
 * AuthContext.tsx — GoTransit Regina
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

interface AuthContextValue {
    isAuthenticated: boolean;
    /** True only when the authenticated user has role = 'admin' in profiles. */
    isAdmin: boolean;
    /** Null while session is loading; populated once auth state is known. */
    user: User | null;
    /** True until the initial session + role fetch completes — prevents flash redirects. */
    isLoading: boolean;
    /** Returns null on success, or an error message string on failure. */
    login: (identifier: string, password: string) => Promise<string | null>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchRole(userId: string): Promise<'user' | 'admin'> {
    const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
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
            fetchRole(session.user.id)
                .then(r => setRole(r))
                .catch(() => setRole('user'));
        } else {
            setRole('user');
        }
    }, [session?.user?.id]);

    const login = useCallback(async (identifier: string, password: string): Promise<string | null> => {
        let email = identifier.trim();

        // If the identifier looks like a mobile number, format it and resolve email via RPC
        // (RPC uses SECURITY DEFINER to bypass RLS for unauthenticated users)
        if (/^\+?\d/.test(email)) {
            const formatted = formatMobile(email);
            const { data: resolvedEmail, error: rpcError } = await supabase.rpc('get_email_by_mobile', { mobile: formatted });
            if (rpcError) {
                console.error('[Auth] Mobile lookup RPC failed:', rpcError.message);
                return 'Mobile login is not available. Please use your email.';
            }
            if (!resolvedEmail) return 'No account found with this mobile number.';
            email = resolvedEmail;
        }

        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
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
