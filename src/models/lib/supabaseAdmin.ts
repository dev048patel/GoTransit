import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

// Lazily create the service-role client so a missing env var doesn't crash startup.
export function getSupabaseAdmin(): SupabaseClient {
    if (_client) return _client;

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            'SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_URL) is not set. ' +
            'Add it to Railway environment variables.'
        );
    }

    _client = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    return _client;
}
