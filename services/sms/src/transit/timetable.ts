/**
 * The bus timetable, loaded from data/timetable.json (built by scripts/build-timetable.mjs).
 * Stops are referred to by their index in the file; `stopIds[i]` is the GTFS / TransitLive stop id.
 */
import fs from 'node:fs';
import path from 'node:path';
import { metresBetween, walkMinutes } from './geo';
import { gtfsDate } from '../time';

export interface RawTimetable {
    version: number;
    builtAt: string;
    feed: { start: string; end: string };
    stops: [id: string, name: string, lat: number, lng: number][];
    services: [id: string, days: string, start: string, end: string, added: string[], removed: string[]][];
    patterns: { route: string; headsign: string; stops: number[]; trips: number[][] }[];
    footpaths: [a: number, b: number, minutes: number][];
}

export interface Pattern { route: string; headsign: string; stops: number[]; trips: { service: number; times: number[] }[] }

/** One service day: for each pattern, the times of the trips that run that day, earliest first */
export interface ServiceDay { date: string; trips: number[][][] }

export interface NearbyStop { stop: number; metres: number; minutes: number }

export class Timetable {
    readonly stopIds: string[];
    readonly names: string[];
    readonly lat: number[];
    readonly lng: number[];
    readonly patterns: Pattern[];
    /** for each stop: the patterns calling there and at which position */
    readonly stopPatterns: [pattern: number, pos: number][][];
    /** for each stop: stops within walking distance and the minutes to walk there */
    readonly footpaths: [stop: number, minutes: number][][];
    readonly feed: RawTimetable['feed'];
    private readonly services: RawTimetable['services'];
    private readonly index: Map<string, number>;
    private readonly days = new Map<string, ServiceDay>();

    constructor(raw: RawTimetable) {
        this.stopIds = raw.stops.map(s => s[0]);
        this.names = raw.stops.map(s => s[1]);
        this.lat = raw.stops.map(s => s[2]);
        this.lng = raw.stops.map(s => s[3]);
        this.index = new Map(this.stopIds.map((id, i) => [id, i]));
        this.services = raw.services;
        this.feed = raw.feed;
        this.patterns = raw.patterns.map(p => ({ route: p.route, headsign: p.headsign, stops: p.stops, trips: p.trips.map(([service, ...times]) => ({ service, times })) }));
        this.stopPatterns = this.stopIds.map(() => []);
        this.patterns.forEach((p, pi) => p.stops.forEach((s, pos) => this.stopPatterns[s].push([pi, pos])));
        this.footpaths = this.stopIds.map(() => []);
        for (const [a, b, m] of raw.footpaths) { this.footpaths[a].push([b, m]); this.footpaths[b].push([a, m]); }
    }

    static load(file = path.resolve(__dirname, '../../data/timetable.json')): Timetable {
        return new Timetable(JSON.parse(fs.readFileSync(file, 'utf8')));
    }

    stopIndex(id: string): number | undefined { return this.index.get(id); }

    /** Does a GTFS service run on this Regina date ('YYYY-MM-DD')? */
    runs(service: number, date: string): boolean {
        const [, days, start, end, added, removed] = this.services[service];
        const d = gtfsDate(date);
        if (removed.includes(d)) return false;
        if (added.includes(d)) return true;
        const monFirst = (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
        return days[monFirst] === '1' && (!start || start <= d) && (!end || d <= end);
    }

    /** The trips running on a date, per pattern. Cached; a day's timetable never changes. */
    day(date: string): ServiceDay {
        let d = this.days.get(date);
        if (!d) {
            d = { date, trips: this.patterns.map(p => p.trips.filter(t => this.runs(t.service, date)).map(t => t.times)) };
            if (this.days.size > 7) this.days.clear();
            this.days.set(date, d);
        }
        return d;
    }

    /** Is the feed's calendar still current on this date? An expired feed plans nothing, which would read as "no buses". */
    covers(date: string): boolean {
        const d = gtfsDate(date);
        return (!this.feed.start || this.feed.start <= d) && (!this.feed.end || d <= this.feed.end);
    }

    nearbyStops(lat: number, lng: number, maxMetres: number): NearbyStop[] {
        const out: NearbyStop[] = [];
        for (let i = 0; i < this.stopIds.length; i++) {
            if (Math.abs(this.lat[i] - lat) > maxMetres / 100_000) continue;   // cheap latitude cut first
            const metres = metresBetween(lat, lng, this.lat[i], this.lng[i]);
            if (metres <= maxMetres) out.push({ stop: i, metres, minutes: walkMinutes(metres) });
        }
        return out.sort((a, b) => a.metres - b.metres);
    }

    metresToStop(stop: number, lat: number, lng: number): number {
        return metresBetween(this.lat[stop], this.lng[stop], lat, lng);
    }
}

let shared: Timetable | null = null;
/** The timetable the service runs on, loaded once */
export function timetable(): Timetable {
    return shared ??= Timetable.load();
}
