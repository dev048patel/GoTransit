/*
This is the Buisness/Backend Logic Layer. "Decision making" 
1. Recieve req from controller
2. Call Repository to fetch data
3. Applies Logic
4. Returns data to controller
*/
import { RouteRepository } from '../repositories/RouteRepository';
import { Route } from '../models/Route';

export class TransitService {
    private routeRepo: RouteRepository;

    constructor() {
        // Dependency Injection could also be used here
        this.routeRepo = new RouteRepository();
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
}
