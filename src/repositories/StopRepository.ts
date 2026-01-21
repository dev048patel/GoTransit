/**
 * @file StopRepository.ts
 * @description Data Access Layer for Stop entities.
 */
import { Stop } from '../models/Stop';
import transitStops from '../data/transitStops';

export class StopRepository {
    private stops: Stop[] = transitStops;

    /**
     * @method getAll
     * @description Retrieves all stops.
     */
    async getAll(): Promise<Stop[]> {
        return this.stops;
    }

    /**
     * @method getById
     * @description Finds a single stop by its STOP_ID.
     */
    async getById(id: string): Promise<Stop | undefined> {
        return this.stops.find(s => s.STOP_ID === id);
    }
}
