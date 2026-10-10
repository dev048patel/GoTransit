/**
 * WeatherService.ts — backend only
 *
 * Fetches current conditions for Regina from Environment Canada GeoMet OGC API.
 * Endpoint: GET /collections/citypageweather-realtime/items/sk-32
 *   sk-32 = Regina, Saskatchewan. No API key required — public Gov of Canada data.
 *
 * Cache TTL: 30 minutes (~48 fetches/day). EC updates every ~5 min but
 * weather changes slowly enough that 30-min polling is accurate and polite.
 */

const EC_URL =
    'https://api.weather.gc.ca/collections/citypageweather-realtime/items/sk-32?f=json&lang=en';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

export interface WeatherSnapshot {
    tempC: number | null;
    windchillC: number | null;
    conditionText: string;
    windSpeedKmh: number | null;
    windGustKmh: number | null;
    windDir: string;
    /** 1.00–1.40: how much longer walking takes in current conditions */
    walkMultiplier: number;
    // advisory flags
    isCold: boolean;        // temp < 0°C
    isExtremeCold: boolean; // windchill < -30 or temp < -25
    isSmoky: boolean;       // smoke / haze advisory
    // general condition flags
    isSnowy: boolean;       // snow / flurries / blizzard
    isRainy: boolean;       // rain / drizzle / showers / freezing rain
    isWindy: boolean;       // wind >= 50 km/h or "wind" in text
    isCloudy: boolean;      // cloudy / overcast
    isSunny: boolean;       // sunny / clear / few clouds
    fetchedAt: string;
}

/* ── internal cache ──────────────────────────────────────────────────────── */
let _cached: WeatherSnapshot | null = null;
let _cachedAt = 0;

/* ── helpers ─────────────────────────────────────────────────────────────── */

function computeWalkMultiplier(tempC: number | null, windchillC: number | null): number {
    const effective = windchillC ?? tempC;
    if (effective === null || effective > -10) return 1.00;
    if (effective > -20) return 1.10;
    if (effective > -30) return 1.20;
    if (effective > -40) return 1.30;
    return 1.40;
}

/* ── main fetch ──────────────────────────────────────────────────────────── */

async function fetchFromEC(): Promise<WeatherSnapshot> {
    const res = await fetch(EC_URL, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'GoTransitRegina/1.0 (p.p.dev2004@gmail.com)' },
    });

    if (!res.ok) throw new Error(`EC GeoMet returned ${res.status}`);

    const json = await res.json();
    const curr = json?.properties?.currentConditions ?? {};

    const tempC: number | null       = curr.temperature?.value?.en ?? null;
    const windchillC: number | null  = curr.windChill?.value?.en ?? null;
    const conditionText: string      = curr.condition?.en ?? 'Unknown';
    const windSpeedKmh: number | null = curr.wind?.speed?.value?.en ?? null;
    const windGustKmh: number | null  = curr.wind?.gust?.value?.en ?? null;
    const windDir: string            = curr.wind?.direction?.value?.en ?? '';

    const c = conditionText.toLowerCase();

    const isSnowy  = c.includes('snow') || c.includes('flurr') || c.includes('blizzard');
    const isRainy  = c.includes('rain') || c.includes('shower') || c.includes('drizzle');
    const isWindy  = (windGustKmh !== null && windGustKmh >= 40) || (windSpeedKmh !== null && windSpeedKmh >= 40) || c.includes('wind');
    const isCloudy = c.includes('cloud') || c.includes('overcast');
    const isSunny  = c.includes('sunny') || c.includes('clear') || c.includes('fair') || c.includes('a few clouds');
    const isSmoky  = c.includes('smoke') || c.includes('smoky') || c.includes('haze');

    return {
        tempC,
        windchillC,
        conditionText,
        windSpeedKmh,
        windGustKmh,
        windDir,
        walkMultiplier: computeWalkMultiplier(tempC, windchillC),
        isCold:        tempC !== null && tempC < 0,
        isExtremeCold: (windchillC !== null && windchillC < -30) || (tempC !== null && tempC < -25),
        isSmoky,
        isSnowy,
        isRainy,
        isWindy,
        isCloudy,
        isSunny,
        fetchedAt: new Date().toISOString(),
    };
}

/* ── public API ──────────────────────────────────────────────────────────── */

export const WeatherService = {
    async getCurrent(): Promise<WeatherSnapshot> {
        const now = Date.now();
        if (_cached && now - _cachedAt < CACHE_TTL_MS) return _cached;
        const snapshot = await fetchFromEC();
        _cached = snapshot;
        _cachedAt = now;
        return snapshot;
    },

    clearCache(): void {
        _cached = null;
        _cachedAt = 0;
    },
};
