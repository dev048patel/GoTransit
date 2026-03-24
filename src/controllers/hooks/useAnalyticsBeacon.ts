/* useAnalyticsBeacon — sends beacon on page load and heartbeat every 60s to track visitor sessions */
import { useEffect } from 'react';
import { useAuth } from '../../models/context/AuthContext';
import { sendBeacon, sendHeartbeat, updateLastActive } from '../../models/services/AnalyticsService';

const HEARTBEAT_INTERVAL = 60 * 1000; // 60 seconds

// All API calls are delegated to AnalyticsService — this hook only orchestrates timing
export function useAnalyticsBeacon() {
    const { user } = useAuth();

    useEffect(() => {
        // Send initial beacon and update last_active for authenticated users
        sendBeacon(window.location.pathname, user?.id);
        if (user?.id) updateLastActive(user.id);

        // Heartbeat keeps the session alive on the backend
        const interval = setInterval(() => {
            sendHeartbeat(window.location.pathname, user?.id);
            if (user?.id) updateLastActive(user.id);
        }, HEARTBEAT_INTERVAL);

        return () => clearInterval(interval);
    }, [user?.id]);
}
