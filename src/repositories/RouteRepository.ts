/**
 * @file RouteRepository.ts
 * @description Data Access Layer for Route entities.
 * @purpose Directly interacts with the database (or mock data source).
 *          It isolates the database query logic from the rest of the application.
 */
import { Route } from '../models/Route';

export class RouteRepository {
    // Mock Database
    private routes: Route[] = [
        { id: '1', name: 'Downtown Express', stops: ['Central', 'Market', 'Union'] },
        { id: '2', name: 'Campus Loop', stops: ['Dorm A', 'Library', 'Gym'] },
    ];

    /**
     * @method getAll
     * @description Retrieves all records from the storage.
     */
    async getAll(): Promise<Route[]> {
        return this.routes;
    }

    /**
     * @method getById
     * @description Finds a single record by its unique ID.
     */
    async getById(id: string): Promise<Route | undefined> {
        return this.routes.find(r => r.id === id);
    }
}
