/*
 DetourService
 Loads detour polylines from local JSON snapshots in src/detourData/detour_data/.
 Filters by current date so only detours active right now are returned.
*/

import { DetourApiResponse, ActiveDetour } from '../transit/Detour';

// Vite glob import — eagerly bundles every route_*_detour.json file at build time.
// Key example: "/src/detourData/detour_data/route_4_detour.json"
const detourFiles = import.meta.glob<DetourApiResponse>(
    '../../detourData/detour_data/route_*_detour.json',
    { eager: true, import: 'default' }
);

// Build routeNum → DetourApiResponse map once at module load
const routeDetourData: Map<string, DetourApiResponse> = (() => {
    const map = new Map<string, DetourApiResponse>();
    for (const [path, data] of Object.entries(detourFiles)) {
        const match = path.match(/route_(\d+)_detour\.json$/);
        if (match) map.set(match[1], data);
    }
    return map;
})();

function parseActiveDetours(routeNum: string, data: DetourApiResponse): ActiveDetour[] {
    const now = Date.now();
    const active: ActiveDetour[] = [];
    const count = data.coordinates?.length ?? 0;
    for (let i = 0; i < count; i++) {
        const start = new Date(data.startDates[i]).getTime();
        const end = new Date(data.endDates[i]).getTime();
        if (isNaN(start) || isNaN(end)) continue;
        if (now < start || now > end) continue;

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
    return active;
}

export class DetourService {
    /** Active detours for a single route. */
    static async getActiveDetours(routeNum: string): Promise<ActiveDetour[]> {
        const data = routeDetourData.get(routeNum);
        if (!data) return [];
        return parseActiveDetours(routeNum, data);
    }

    /** Active detours across every route in the bundled detour_data folder. */
    static async getAllActiveDetours(): Promise<ActiveDetour[]> {
        const all: ActiveDetour[] = [];
        for (const [routeNum, data] of routeDetourData) {
            all.push(...parseActiveDetours(routeNum, data));
        }
        return all;
    }

    /** True if the given route has at least one currently-active detour. */
    static async hasActiveDetour(routeNum: string): Promise<boolean> {
        const detours = await this.getActiveDetours(routeNum);
        return detours.length > 0;
    }
}
