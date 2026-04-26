/*
 DetourService
 Fetches active detour polylines for a transit route from the TransitLive API.
 Filters by current date so only detours active right now are returned.
*/

import { DetourApiResponse, ActiveDetour } from '../transit/Detour';

const API_BASE = 'https://transitlive.com/ajax/detour.php';

// Per-route in-memory cache so we don't refetch on every selection
const cache = new Map<string, { fetchedAt: number; detours: ActiveDetour[] }>();
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes

export class DetourService {
    /**
     * Fetch detours for a specific route, filter to those active right now.
     * Returns [] on network/parse error.
     */
    static async getActiveDetours(routeNum: string): Promise<ActiveDetour[]> {
        const cached = cache.get(routeNum);
        if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
            return cached.detours;
        }

        try {
            const url = `${API_BASE}?action=loadDetour&route=${encodeURIComponent(routeNum)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Detour API error: ${response.status}`);

            const data: DetourApiResponse = await response.json();
            const now = Date.now();
            const active: ActiveDetour[] = [];

            const count = data.coordinates?.length ?? 0;
            for (let i = 0; i < count; i++) {
                const start = new Date(data.startDates[i]).getTime();
                const end = new Date(data.endDates[i]).getTime();
                if (isNaN(start) || isNaN(end)) continue;
                if (now < start || now > end) continue; // not active right now

                const path = data.coordinates[i].map(([lat, lng]) => ({
                    lat: parseFloat(lat),
                    lng: parseFloat(lng),
                })).filter(p => !isNaN(p.lat) && !isNaN(p.lng));
                if (path.length < 2) continue;

                active.push({
                    routeNum,
                    detourId: data.detourIDs[i],
                    path,
                    startDate: new Date(data.startDates[i]),
                    endDate: new Date(data.endDates[i]),
                    color: data.style?.color || '#FF0000',
                    opacity: data.style?.opacity ?? 1,
                });
            }

            cache.set(routeNum, { fetchedAt: Date.now(), detours: active });
            return active;
        } catch (err) {
            console.error(`[DetourService] Failed to fetch detours for route ${routeNum}:`, err);
            return [];
        }
    }

    /**
     * Convenience: returns true if the given route has any detour active right now.
     */
    static async hasActiveDetour(routeNum: string): Promise<boolean> {
        const detours = await this.getActiveDetours(routeNum);
        return detours.length > 0;
    }
}
