/**
 * UserRegistry.ts — GoTransit Regina
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
 * Admin RLS (run once to allow admins to read/update ALL profiles):
 *
 *   DROP POLICY IF EXISTS "Own profile" ON public.profiles;
 *   CREATE POLICY "Own or admin profile" ON public.profiles FOR ALL USING (
 *     auth.uid() = id
 *     OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
 *   );
 */

import { supabase } from '../lib/supabase';
import type { User } from '../admin/AdminTypes';

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

/** Update a user's name, role, or status in the profiles table. */
export async function updateUserProfile(
    id: string,
    fields: { full_name?: string; role?: string; account_status?: string }
): Promise<string | null> {
    const { error } = await supabase
        .from('profiles')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id);
    return error ? error.message : null;
}

/** Soft-delete: marks the profile as deleted (does not remove auth record). */
export async function softDeleteUser(id: string): Promise<string | null> {
    const { error } = await supabase
        .from('profiles')
        .update({ account_status: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', id);
    return error ? error.message : null;
}

/** Called on logout — logs event to the browser console. */
export function recordLogout(email: string): void {
    console.log(
        '%c[GoTransit] 🚪 LOGOUT',
        'background:#6B7280;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold',
        { email, at: new Date().toLocaleTimeString() }
    );
}
