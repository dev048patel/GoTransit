/*
This is the Business/Backend Logic Layer. "Decision making" 
1. Receive req from controller
2. Call Repository to fetch data
3. Applies Logic
4. Returns data to controller
*/
import { RouteRepository } from '../repositories/RouteRepository';
import { Route } from '../models/transit/Route';
import { StopRepository } from '../repositories/StopRepository';
import { Stop } from '../models/transit/Stop';

import { RouteColor } from '../models/transit/RouteColor';
import transitColors from '../data/transitColors';

export class TransitService {
    private routeRepo: RouteRepository;
    private stopRepo: StopRepository;

    constructor() {
        // Dependency Injection could also be used here
        this.routeRepo = new RouteRepository();
        this.stopRepo = new StopRepository();
    }

    /*
     Fetches all routes from the repository.
     (Add business logic here if needed, e.g., filtering active routes only)
     */
    async getAvailableRoutes(): Promise<Route[]> {
        return this.routeRepo.getAll();
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
