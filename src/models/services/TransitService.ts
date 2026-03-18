/*
This is the Business/Backend Logic Layer. "Decision making" 
1. Receive req from controller
2. Call Repository to fetch data
3. Applies Logic
4. Returns data to controller
*/
import { RouteRepository } from '../repositories/RouteRepository';
import { Route } from '../transit/Route';
import { StopRepository } from '../repositories/StopRepository';
import { Stop } from '../transit/Stop';

import { RouteColor } from '../transit/RouteColor';
import transitColors from '../data/transitColors';
import { getOverrides } from './routeOverrides';

export class TransitService {
    private routeRepo: RouteRepository;
    private stopRepo: StopRepository;

    constructor() {
        this.routeRepo = new RouteRepository();
        this.stopRepo = new StopRepository();
    }

    /*
     Fetches all routes visible to map users.
     Applies admin overrides: filters out hidden routes and applies renames.
     */
    async getAvailableRoutes(): Promise<Route[]> {
        const all = await this.routeRepo.getAll();
        const overrides = getOverrides();

        return all
            .filter(r => !overrides[r.ROUTE_ID]?.hidden)
            .map(r => {
                const ov = overrides[r.ROUTE_ID];
                return ov?.route_name ? { ...r, ROUTE_NAME: ov.route_name } : r;
            });
    }

    /*
     Fetches ALL routes for the admin panel (including hidden ones).
     Returns each route with its current status and override data.
     */
    async getAllRoutesAdmin() {
        const all = await this.routeRepo.getAll();
        const overrides = getOverrides();

        return all.map(r => {
            const ov = overrides[r.ROUTE_ID];
            return {
                id: r.ROUTE_ID,
                route_num: parseInt(r.ROUTE_NUM, 10),
                route_name: ov?.route_name || r.ROUTE_NAME,
                original_name: r.ROUTE_NAME,
                status: ov?.hidden ? 'Hidden' as const : 'Active' as const,
                stops_count: 0,
                last_updated: ov ? 'Admin Override' : 'Static Data',
            };
        });
    }

    /*
    Fetches a specific route by ID.
    */
    async getRouteDetails(id: string): Promise<Route | undefined> {
        return this.routeRepo.getById(id);
    }

    /*
    Fetches all available transit stops.
    */
    async getStops(): Promise<Stop[]> {
        return this.stopRepo.getAll();
    }

    /*
    Fetches all route colors.
    */
    async getColors(): Promise<RouteColor[]> {
        return transitColors;
    }
}
