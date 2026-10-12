/**
 * serverDb.ts — which Supabase client the backend uses for what.
 *
 *  serviceDb()      the backend's own work (analytics, cron, admin actions). Uses the service-role
 *                   key, which bypasses row-level security, so it must never leave the server.
 *  userDb(token)    acts as the signed-in user: row-level security applies to everything it does.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from './supabaseServer';
import { getSupabaseAdmin } from './supabaseAdmin';

let warned = false;

export function hasServiceKey(): boolean {
    return !!(process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function serviceDb(): SupabaseClient {
    if (hasServiceKey()) return getSupabaseAdmin();
    // Without the key the backend only has visitor-level rights. Keep running (so a missing
    // setting never takes the site down) but say so loudly: once the tables are locked this
    // client can no longer write analytics or read schedules.
    if (!warned) {
        warned = true;
        console.warn('[Security] SUPABASE_SERVICE_ROLE_KEY is not set — backend is using the public key.');
    }
    return supabaseServer;
}

export function userDb(token: string): SupabaseClient {
    return createClient(process.env.VITE_SUPABASE_URL as string, process.env.VITE_SUPABASE_ANON_KEY as string, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
    });
}
