/*
This is the Buisness/Backend Logic Layer. "Decision making" 
1. Recieve req from controller
2. Call Repository to fetch data
3. Applies Logic
4. Returns data to controller
*/
import { RouteRepository } from '../repositories/RouteRepository';
import { Route } from '../models/Route';
import { StopRepository } from '../repositories/StopRepository';
import { Stop } from '../models/Stop';

import { RouteColor } from '../models/RouteColor';
import transitColors from '../data/transitColors';

export class TransitService {
    private routeRepo: RouteRepository;
    private stopRepo: StopRepository;

    constructor() {
        // Dependency Injection could also be used here
        this.routeRepo = new RouteRepository();
        this.stopRepo = new StopRepository();
    }

    /**
     * @method getAvailableRoutes
     * @description Fetches all routes from the repository.
     *              (Add business logic here if needed, e.g., filtering active routes only)
     */
    async getAvailableRoutes(): Promise<Route[]> {
        return this.routeRepo.getAll();
    }

    /**
     * @method getRouteDetails
     * @description Fetches a specific route by ID.
     */
    async getRouteDetails(id: string): Promise<Route | undefined> {
        return this.routeRepo.getById(id);
    }

    /**
     * @method getStops
     * @description Fetches all available transit stops.
     */
    async getStops(): Promise<Stop[]> {
        return this.stopRepo.getAll();
    }

    /**
     * @method getColors
     * @description Fetches all route colors.
     */
    async getColors(): Promise<RouteColor[]> {
        return transitColors;
    }
}
