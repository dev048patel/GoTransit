/**
 * UserRegistry.ts — GoTransit Regina
 *
 * User data access via Supabase.
 * - getAllUsers() / getRealUserCount() read from the public.profiles table
 * - recordLogout() logs the logout event to the console
 *
 * Supabase handles signup, login, and session management — no localStorage
 * credential storage or Express API calls needed.
 */

import { supabase } from '../lib/supabase';
import type { User } from '../models/admin/AdminTypes';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-CA', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

/**
 * Fetches all registered users from the profiles table for the admin panel.
 */
export async function getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, account_status, created_at')
        .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map(row => ({
        id: row.id,
        name: row.full_name,
        email: row.email ?? '—',
        role: 'Traveler',
        status: row.account_status === 'active' ? 'Active' : 'Suspended',
        registered: formatDate(row.created_at),
        last_login: '—',
    }));
}

/** Total user count from the profiles table. */
export async function getRealUserCount(): Promise<number> {
    const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    return error ? 0 : (count ?? 0);
}

/** Called on logout — logs event to the browser console. */
export function recordLogout(email: string): void {
    console.log(
        '%c[GoTransit] 🚪 LOGOUT',
        'background:#6B7280;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold',
        { email, at: new Date().toLocaleTimeString() }
    );
}

/** Wipe the local user cache — useful for dev/testing from the browser console. */
export function clearAllUsers(): void {
    localStorage.removeItem('gotransit_users');
    console.log('%c[GoTransit] 🗑️  User cache cleared', 'color:#EF4444;font-weight:bold');
}
