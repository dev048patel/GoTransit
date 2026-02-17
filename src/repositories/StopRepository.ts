/*
    Data Access Layer for Stop entities.
*/
import { Stop } from '../models/transit/Stop';
import transitStops from '../data/transitStops';

export class StopRepository {
    private stops: Stop[] = transitStops;

    /*
        Retrieves all stops.
    */
    async getAll(): Promise<Stop[]> {
        return this.stops;
    }

    /*
        Finds a single stop by its STOP_ID.
    */
    async getById(id: string): Promise<Stop | undefined> {
        return this.stops.find(s => s.STOP_ID === id);
    }
}
