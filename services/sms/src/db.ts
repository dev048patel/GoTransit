/**
 * Supabase clients. Both use the service-role key, which bypasses row-level security, so it must
 * only ever be set on this service and the main API.
 *
 *   sms()   the service's own tables (schema "sms", which must be listed under Exposed schemas)
 *   app()   the app's tables it reads: profiles, weekly_schedules, saved_destinations
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';

let client: SupabaseClient | null = null;
let clientFor = '';

function base(): SupabaseClient {
    const { supabaseUrl, supabaseKey } = config();
    if (!supabaseUrl || !supabaseKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    if (!client || clientFor !== supabaseUrl + supabaseKey) {
        client = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
        clientFor = supabaseUrl + supabaseKey;
    }
    return client;
}

export const sms = () => base().schema('sms');
export const app = () => base();

/** Throws the query's error, so a job fails loudly instead of acting on missing rows. */
export function must<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
    if (r.error) throw new Error(`${what}: ${r.error.message}`);
    return r.data as T;
}
