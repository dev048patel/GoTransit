/**
 * TransitLive, the city's live bus feed: where each bus is, and predicted arrivals per stop.
 * Answers are cached briefly so many riders on one bus cost one request. Any failure returns
 * null ("live data unavailable"), never throws: the tracker then falls back to the timetable.
 */
import { config } from '../config';
import { parseHhmm } from '../time';

export interface Prediction { busId: string | null; route: string; stopId: string; minutes: number }
export interface LiveBus { busId: string; route: string; lat: number; lng: number }

const PREDICTIONS_TTL_MS = 20_000, BUSES_TTL_MS = 10_000, TIMEOUT_MS = 8_000;

/** TransitLive numbers routes 4, the timetable says "4"; letters (e.g. "50A") compare case-blind */
export const sameRoute = (a: unknown, b: unknown) => {
    const norm = (v: unknown) => { const s = String(v ?? '').trim().toUpperCase(); return /^\d+$/.test(s) ? String(Number(s)) : s; };
    return norm(a) === norm(b);
};

/** "08:18 PM" → minutes after midnight */
export function predictionMinutes(v: unknown): number | null {
    const m = typeof v === 'string' ? /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(v.trim()) : null;
    if (!m) return parseHhmm(v);
    const h = Number(m[1]) % 12 + (m[3].toUpperCase() === 'PM' ? 12 : 0);
    return h * 60 + Number(m[2]);
}

const predictionCache = new Map<string, { at: number; value: Prediction[] | null }>();
let busCache: { at: number; value: LiveBus[] | null } | null = null;

async function getJson(url: string): Promise<unknown> {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`TransitLive answered ${res.status}`);
    const text = await res.text();
    return text.trim() ? JSON.parse(text) : [];
}

export async function predictions(stopId: string): Promise<Prediction[] | null> {
    const hit = predictionCache.get(stopId);
    if (hit && Date.now() - hit.at < PREDICTIONS_TTL_MS) return hit.value;
    let value: Prediction[] | null = null;
    try {
        const url = `${config().predictionsUrl}?action=stop_times&stop=${encodeURIComponent(stopId)}&routes=all&lim=100&skip=0&ws=1`;
        const rows = await getJson(url);
        value = (Array.isArray(rows) ? rows : []).flatMap((r: any) => {
            const minutes = predictionMinutes(r?.pred_time);
            return minutes === null ? [] : [{ busId: r.bus_id == null ? null : String(r.bus_id), route: String(r.route_id ?? ''), stopId: String(r.stop_id ?? stopId), minutes }];
        });
    } catch (err) {
        console.warn(`[TransitLive] Predictions for stop ${stopId} unavailable:`, (err as Error).message);
    }
    if (predictionCache.size > 2000) predictionCache.clear();
    predictionCache.set(stopId, { at: Date.now(), value });
    return value;
}

export async function liveBuses(): Promise<LiveBus[] | null> {
    if (busCache && Date.now() - busCache.at < BUSES_TTL_MS) return busCache.value;
    let value: LiveBus[] | null = null;
    const url = config().liveBusesUrl;
    if (url) {
        try {
            const features = await getJson(`${url}?_=${Date.now()}`);
            value = (Array.isArray(features) ? features : []).flatMap((f: any) => {
                const lat = Number(f?.geometry?.coordinates?.[1]), lng = Number(f?.geometry?.coordinates?.[0]);
                return Number.isFinite(lat) && Number.isFinite(lng) && f?.properties?.b != null
                    ? [{ busId: String(f.properties.b), route: String(f.properties.r ?? ''), lat, lng }] : [];
            });
        } catch (err) {
            console.warn('[TransitLive] Live buses unavailable:', (err as Error).message);
        }
    }
    busCache = { at: Date.now(), value };
    return value;
}

/** Test hook */
export function _clearTransitLiveCache() { predictionCache.clear(); busCache = null; }
