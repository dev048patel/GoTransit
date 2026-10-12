/* AnalyticsService — wraps all frontend analytics API calls (beacon, heartbeat, last_active) */
import { supabase } from '../lib/supabase';
import { apiPost } from '../lib/apiClient';

// The backend links a visit to an account from the login token (sent automatically by apiPost
// when someone is signed in) — the page never tells the server who the user is.

// Send initial page-load beacon to register the visitor session
export function sendBeacon(page: string, _userId?: string): void {
    apiPost('/api/analytics/beacon', { page }).catch(() => {}); // silent fail — analytics should never break the app
}

// Send periodic heartbeat to keep the visitor session alive
export function sendHeartbeat(page: string, _userId?: string): void {
    apiPost('/api/analytics/heartbeat', { page }).catch(() => {});
}

// Update last_active timestamp in Supabase profiles for authenticated users
export function updateLastActive(userId: string): void {
    supabase
        .from('profiles')
        .update({ last_active: new Date().toISOString() })
        .eq('id', userId)
        .then(() => {});
}
