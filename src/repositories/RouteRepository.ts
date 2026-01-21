/**
 * @file RouteRepository.ts
 * @description Data Access Layer for Route entities.
 * @purpose Directly interacts with the database (or mock data source).
 *          It isolates the database query logic from the rest of the application.
 */
import { Route } from '../models/Route';
import transitRoutes from '../data/transitRoutes';

export class RouteRepository {
    // Using the real data file as our source of truth
    private routes: Route[] = transitRoutes;

    /**
     * @method getAll
     * @description Retrieves all records from the storage.
     */
    async getAll(): Promise<Route[]> {
        return this.routes;
    }

    /**
     * @method getById
     * @description Finds a single record by its unique ID (ROUTE_ID).
     */
    async getById(id: string): Promise<Route | undefined> {
        return this.routes.find(r => r.ROUTE_ID === id);
    }
}
