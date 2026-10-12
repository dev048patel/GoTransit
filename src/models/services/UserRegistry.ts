/**
 * UserRegistry.ts — Transit Regina
 *
 * User data access via Supabase profiles table.
 * Note: email is stored in auth.users (not profiles). Run the SQL below in
 * Supabase SQL Editor to expose it in profiles:
 *
 *   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
 *   CREATE OR REPLACE FUNCTION public.handle_new_user()
 *   RETURNS trigger AS $$
 *   BEGIN
 *     INSERT INTO public.profiles (id, full_name, email)
 *     VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name','User'), new.email);
 *     INSERT INTO public.user_preferences (id) VALUES (new.id)
 *     ON CONFLICT DO NOTHING;
 *     RETURN new;
 *   END;
 *   $$ LANGUAGE plpgsql SECURITY DEFINER;
 *
 * Database access rules for profiles live in docs/security/001_hardening.sql.
 */

import { supabase } from '../lib/supabase';
import type { User } from '../admin/AdminTypes';
import { apiPatch, apiDelete } from '../lib/apiClient';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-CA', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

/** Fetches all registered users from the profiles table for the admin panel. */
export async function getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, account_status, created_at, last_active')
        .order('created_at', { ascending: false });

    if (error || !data) return [];

    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;

    return data.map(row => {
        const lastActiveMs = row.last_active ? new Date(row.last_active).getTime() : 0;
        return {
            id: row.id,
            name: row.full_name ?? '—',
            email: row.email ?? '—',
            role: row.role ?? 'user',
            status: row.account_status === 'active' ? 'Active' : 'Suspended',
            registered: formatDate(row.created_at),
            last_active: row.last_active ? formatDate(row.last_active) : '—',
            isOnline: lastActiveMs > twoMinutesAgo,
        };
    });
}

/** Total user count from the profiles table. */
export async function getRealUserCount(): Promise<number> {
    const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    return error ? 0 : (count ?? 0);
}

/** Update a user's name, role, or status. Goes through the backend, which checks the caller is an admin and records the change. */
export async function updateUserProfile(
    id: string,
    fields: { full_name?: string; role?: string; account_status?: string }
): Promise<string | null> {
    try { await apiPatch(`/api/admin/users/${id}`, fields); return null; }
    catch (e) { return (e as Error).message; }
}

/** Delete user via backend (uses service-role to hard-delete from auth + profiles). */
export async function softDeleteUser(id: string): Promise<string | null> {
    try { await apiDelete(`/api/admin/users/${id}`); return null; }
    catch (e) { return (e as Error).message; }
}

/** Called on logout — logs event to the browser console. */
export function recordLogout(email: string): void {
    // No personal details in the browser console
    void email;
}
