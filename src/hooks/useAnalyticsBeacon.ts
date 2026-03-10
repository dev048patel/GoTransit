/*
  Analytics Beacon Hook
  Sends a single beacon to the backend when the site loads,
  then sends a heartbeat every 60 seconds to keep the session alive.

  Also updates the authenticated user's last_active timestamp in profiles.
  This is the ONLY source of analytics data — no middleware tracking API polls.
*/

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const HEARTBEAT_INTERVAL = 60 * 1000; // 60 seconds

export function useAnalyticsBeacon() {
    const baseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'; // Will remove local host @ End
    const { user } = useAuth();

    useEffect(() => {
        // Update last_active in profiles for authenticated users
        const updateLastActive = () => {
            if (!user?.id) return;
            supabase
                .from('profiles')
                .update({ last_active: new Date().toISOString() })
                .eq('id', user.id)
                .then(() => { });
        };

        // Send initial beacon — "a real user just opened the site"
        const sendBeacon = () => {
            fetch(`${baseUrl}/api/analytics/beacon`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ page: window.location.pathname }),
            }).catch(() => { }); // Silent fail — analytics should never break the app
            updateLastActive();
        };

        // Heartbeat — "this user is still here"
        const sendHeartbeat = () => {
            fetch(`${baseUrl}/api/analytics/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ page: window.location.pathname }),
            }).catch(() => { });
            updateLastActive();
        };

        sendBeacon();
        const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

        return () => clearInterval(interval);
    }, [baseUrl, user?.id]);
}
