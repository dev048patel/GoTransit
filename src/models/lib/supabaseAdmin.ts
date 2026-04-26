import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!serviceRoleKey) {
    console.warn('[Admin] SUPABASE_SERVICE_ROLE_KEY not set — admin write operations will fail');
}

// Service-role client: bypasses RLS. Backend only — never expose this key to the browser.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || '', {
    auth: { autoRefreshToken: false, persistSession: false },
});
