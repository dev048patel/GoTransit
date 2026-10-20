/*
 TransitDirectory
 Every Regina bus route and stop as a page of its own: the route's stops in order both ways, a drawn
 map, which routes connect, and for each stop the routes that serve it, where they are heading, the
 stops either side and the stops nearby.

 These pages are what people actually search for ("Regina route 4 bus", "bus stop 0742"), so they
 are pre-rendered to plain HTML at build time (scripts/prerender.tsx) as well as shown in the app.
 Everything here is plain data, with no browser APIs, so it runs in both places.

 Source: the City of Regina GTFS feed (Open Regina), via the files scripts/build-transit-data.mjs makes.
*/
import transitRoutes from '../data/transitRoutes';
import transitStops from '../data/transitStops';
import transitColors from '../data/transitColors';
import stopSequences from '../data/gtfsStopSequences.json';
import stopRouteDirections from '../data/gtfsStopRoutes.json';
import transitShapes from '../data/transitShapes.json';
import { Stop } from '../transit/Stop';
import { STOP_DIRECTION_LABEL, directionOfStop } from '../transit/StopDirection';

export interface RouteDirection {
    id: string;
    /** First and last stop: "towards Walsh Acres" */
    from: Stop;
    to: Stop;
    stops: Stop[];
}

export interface RouteInfo {
    num: string;
    /** Readable name, e.g. "Hillsdale – Walsh Acres" */
    name: string;
    slug: string;
    color: string;
    textColor: string;
    directions: RouteDirection[];
    /** Distinct stops served, both directions together */
    stopCount: number;
    /** Other routes sharing at least one stop: where you can change buses */
    connections: string[];
    /** The route drawn as SVG path data in a 1000 × 600 box, in detail and as a light outline */
    svgPath: string;
    svgPathLite: string;
}

export interface StopRoute {
    route: RouteInfo;
    /** Where buses on this route are heading from here */
    towards: string;
    previous?: Stop;
    next?: Stop;
}

export interface StopInfo {
    stop: Stop;
    id: string;
    /** "University Park Dr at Quance St" */
    name: string;
    slug: string;
    direction: string | null;
    lat: number;
    lng: number;
    routes: StopRoute[];
    nearby: { stop: Stop; slug: string; metres: number }[];
}

/* ── Names and addresses ── */
const WORDS: Record<string, string> = { DWTN: 'Downtown', EXP: 'Express', RCMP: 'RCMP' };
/** "ARCOLA E EXP - ARCOLA DWTN EXP" → "Arcola E Express – Arcola Downtown Express" */
export function routeName(raw: string): string {
    return raw.split(' - ').map(part => part.split(/\s+/).map(w => WORDS[w] ?? (w.length <= 1 ? w : w.charAt(0) + w.slice(1).toLowerCase()))
        .join(' ').replace(/\/(\w)/g, (_, c: string) => '/' + c.toUpperCase())).join(' – ');
}
export const slugify = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/@/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
/** "University Park Dr @ Quance St (NB)" → "University Park Dr at Quance St" */
export const stopName = (stop: Stop) => stop.STOP_NAME.replace(/\s*\((NB|SB|EB|WB)\)\s*$/, '').replace(/\s*@\s*/g, ' at ').trim();
export const stopSlug = (stop: Stop) => `${stop.STOP_ID}-${slugify(stopName(stop))}`;

/* ── Distance ── */
export function metresBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const R = 6371000, toRad = Math.PI / 180;
    const dLat = (bLat - aLat) * toRad, dLng = (bLng - aLng) * toRad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

/* ── Build once ── */
const stopsById = new Map<string, Stop>(transitStops.map(s => [s.STOP_ID, s]));
const sequences = stopSequences as Record<string, Record<string, string[]>>;
const servedBy = stopRouteDirections as Record<string, Record<string, number[]>>;
const shapeFeatures = (transitShapes as { features: { properties: { ROUTE_NUM: string }; geometry: { type: string; coordinates: number[][][] | number[][] } }[] }).features;

/* Every route drawn into the same 1000 × 600 box, so the maps share a scale and city outline */
const allPoints = shapeFeatures.flatMap(f => (f.geometry.type === 'MultiLineString' ? (f.geometry.coordinates as number[][][]).flat() : f.geometry.coordinates as number[][]));
const lngs = allPoints.map(p => p[0]), lats = allPoints.map(p => p[1]);
const minLng = Math.min(...lngs), maxLng = Math.max(...lngs), minLat = Math.min(...lats), maxLat = Math.max(...lats);
const midLat = (minLat + maxLat) / 2, xStretch = Math.cos(midLat * Math.PI / 180);
const spanX = (maxLng - minLng) * xStretch, spanY = maxLat - minLat;
const scale = Math.min(960 / spanX, 560 / spanY);
const offsetX = (1000 - spanX * scale) / 2, offsetY = (600 - spanY * scale) / 2;
/** A point on the shared map, in the 1000 × 600 box */
export const project = (lng: number, lat: number) => ({ x: offsetX + (lng - minLng) * xStretch * scale, y: offsetY + (maxLat - lat) * scale });

/** A route as SVG path data; `step` keeps every nth point (3 for a route's own map, 12 for small backdrops) */
export function svgPathFor(num: string, step = 3): string {
    const feature = shapeFeatures.find(f => f.properties.ROUTE_NUM === num);
    if (!feature) return '';
    const lines = feature.geometry.type === 'MultiLineString' ? feature.geometry.coordinates as number[][][] : [feature.geometry.coordinates as number[][]];
    return lines.map(line => line.filter((_, i) => i % step === 0 || i === line.length - 1)
        .map(([lng, lat], i) => { const p = project(lng, lat); return `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`; }).join(' ')).join(' ');
}

/** A route's line, clipped to a window of the shared map (for a stop's neighbourhood map) */
export function svgPathNear(num: string, box: { x: number; y: number; w: number; h: number }): string {
    const feature = shapeFeatures.find(f => f.properties.ROUTE_NUM === num);
    if (!feature) return '';
    const lines = feature.geometry.type === 'MultiLineString' ? feature.geometry.coordinates as number[][][] : [feature.geometry.coordinates as number[][]];
    const pad = Math.max(box.w, box.h) * 0.15;
    const inside = (p: { x: number; y: number }) => p.x >= box.x - pad && p.x <= box.x + box.w + pad && p.y >= box.y - pad && p.y <= box.y + box.h + pad;
    const parts: string[] = [];
    for (const line of lines) {
        let run: string[] = [], last: { x: number; y: number } | null = null;
        for (const [lng, lat] of line) {
            const p = project(lng, lat);
            if (!inside(p)) { if (run.length) parts.push(run.join(' ')); run = []; last = null; continue; }
            if (last && Math.hypot(p.x - last.x, p.y - last.y) < 0.8) continue;   // thinner than a line's width: skip
            run.push(`${run.length ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
            last = p;
        }
        if (run.length) parts.push(run.join(' '));
    }
    return parts.join(' ');
}

const colourFor = (num: string) => transitColors.find(c => String(c.route_id) === num);

export const ROUTES: RouteInfo[] = transitRoutes
    .map(r => {
        const num = r.ROUTE_NUM;
        const name = routeName(r.ROUTE_NAME);
        const directions = Object.entries(sequences[num] ?? {}).map(([id, ids]) => {
            const stops = ids.map(s => stopsById.get(s)).filter((s): s is Stop => !!s);
            return { id, from: stops[0], to: stops[stops.length - 1], stops };
        }).filter(d => d.stops.length > 0);
        const ids = new Set(directions.flatMap(d => d.stops.map(s => s.STOP_ID)));
        const connections = new Set<string>();
        ids.forEach(id => Object.keys(servedBy[id] ?? {}).forEach(other => { if (other !== num) connections.add(other); }));
        const colour = colourFor(num);
        return {
            num, name, slug: `${num}-${slugify(name)}`,
            color: colour?.colour || '#2E7D32', textColor: colour?.text_color || '#ffffff',
            directions, stopCount: ids.size,
            connections: [...connections].sort((a, b) => Number(a) - Number(b)),
            svgPath: svgPathFor(num), svgPathLite: svgPathFor(num, 12),
        };
    })
    .sort((a, b) => Number(a.num) - Number(b.num));

const routesByNum = new Map(ROUTES.map(r => [r.num, r]));
export const routeByNum = (num: string) => routesByNum.get(num);
/** Finds a route by its address; "4" or "4-anything" both work, so old or shortened links still land */
export const routeBySlug = (slug: string) => routesByNum.get(slug.split('-')[0]);

/** Stops served by at least one route: the ones worth a page */
export const SERVED_STOPS: Stop[] = transitStops.filter(s => servedBy[s.STOP_ID] && Object.keys(servedBy[s.STOP_ID]).length > 0);

export function stopInfo(id: string): StopInfo | null {
    const stop = stopsById.get(id);
    if (!stop) return null;
    const lat = Number(stop.LAT), lng = Number(stop.LON);
    const routes: StopRoute[] = Object.entries(servedBy[id] ?? {}).flatMap(([num, dirs]) => {
        const route = routesByNum.get(num);
        if (!route) return [];
        return dirs.flatMap((d): StopRoute[] => {
            const dir = route.directions.find(x => x.id === String(d));
            if (!dir) return [];
            const at = dir.stops.findIndex(s => s.STOP_ID === id);
            return [{ route, towards: stopName(dir.to), previous: at > 0 ? dir.stops[at - 1] : undefined, next: at >= 0 && at < dir.stops.length - 1 ? dir.stops[at + 1] : undefined }];
        });
    }).sort((a, b) => Number(a.route.num) - Number(b.route.num));
    const nearby = SERVED_STOPS
        .filter(s => s.STOP_ID !== id)
        .map(s => ({ stop: s, slug: stopSlug(s), metres: Math.round(metresBetween(lat, lng, Number(s.LAT), Number(s.LON))) }))
        .filter(s => s.metres <= 450)
        .sort((a, b) => a.metres - b.metres)
        .slice(0, 6);
    const direction = directionOfStop(stop);
    return { stop, id, name: stopName(stop), slug: stopSlug(stop), direction: direction ? STOP_DIRECTION_LABEL[direction] : null, lat, lng, routes, nearby };
}

/** Finds a stop by its address; "0742" or "0742-anything" both work */
export const stopBySlug = (slug: string) => stopInfo(slug.split('-')[0]);
