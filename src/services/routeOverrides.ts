/**
 * routeOverrides.ts — GoTransit Regina [Service]
 *
 * Lightweight persistence layer for admin route changes.
 * Stores overrides (renames, hidden status) in a JSON file
 * that merges with the static transitRoutes dataset.
 */
import fs from 'fs';
import path from 'path';

export interface RouteOverride {
    route_name?: string;   // renamed display name
    hidden?: boolean;      // true = hidden from map view
}

export type OverridesMap = Record<string, RouteOverride>;

const OVERRIDES_FILE = path.resolve(__dirname, '../../route-overrides.json');

/** Read all overrides from disk */
export function getOverrides(): OverridesMap {
    try {
        if (fs.existsSync(OVERRIDES_FILE)) {
            const raw = fs.readFileSync(OVERRIDES_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (err) {
        console.error('Error reading route overrides:', err);
    }
    return {};
}

/** Write a single route override (merge with existing) */
export function setOverride(routeId: string, data: Partial<RouteOverride>): OverridesMap {
    const overrides = getOverrides();
    overrides[routeId] = { ...(overrides[routeId] || {}), ...data };
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2), 'utf-8');
    return overrides;
}
