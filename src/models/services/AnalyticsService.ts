/* AnalyticsService — wraps all frontend analytics API calls (beacon, heartbeat, last_active) */
import { supabase } from '../lib/supabase';

const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// Send initial page-load beacon to register the visitor session
export function sendBeacon(page: string): void {
    fetch(`${BASE_URL}/api/analytics/beacon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page }),
    }).catch(() => {}); // silent fail — analytics should never break the app
}

// Send periodic heartbeat to keep the visitor session alive
export function sendHeartbeat(page: string): void {
    fetch(`${BASE_URL}/api/analytics/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page }),
    }).catch(() => {});
}

// Update last_active timestamp in Supabase profiles for authenticated users
export function updateLastActive(userId: string): void {
    supabase
        .from('profiles')
        .update({ last_active: new Date().toISOString() })
        .eq('id', userId)
        .then(() => {});
}
