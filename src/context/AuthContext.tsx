/**
 * AuthContext.tsx — GoTransit Regina
 *
 * React Context that wraps the entire app to provide auth state globally.
 * Session management is handled by Supabase Auth — no localStorage tokens needed.
 *
 * Usage:
 *   const { isAuthenticated, user, login, logout } = useAuth();
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User } from '../models/auth/AuthModel';
import { recordLogout } from '../services/UserRegistry';

interface AuthContextValue {
    isAuthenticated: boolean;
    user: User | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function sessionToUser(session: Session): User {
    return {
        fullName: session.user.user_metadata?.full_name ?? session.user.email ?? 'User',
        email: session.user.email ?? '',
        mobile: session.user.user_metadata?.mobile_number ?? undefined,
    };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        // Load the current session on mount
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

        // Keep state in sync across tabs and on token refresh
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = useCallback(async (email: string, password: string): Promise<boolean> => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        return !error;
    }, []);

    const logout = useCallback(async () => {
        const email = session?.user?.email ?? 'unknown';
        await supabase.auth.signOut();
        recordLogout(email);
    }, [session]);

    const user = session ? sessionToUser(session) : null;

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!session, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
}
