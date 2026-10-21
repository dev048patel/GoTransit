/*
 build-timetable — turns the City of Regina GTFS feed into the timetable the SMS service plans with.

 1. Unzip the Open Regina GTFS download into data/google_transit/ at the repo root (git ignores it).
 2. npm run build:timetable          (or: node scripts/build-timetable.mjs <feed folder>)

 Writes data/timetable.json, which is committed: Railway builds this service from services/sms
 alone and never sees the feed.

   stops      [stop_id, name, lat, lng] — a stop's index in this list is how everything else refers to it
   services   [service_id, "MTWTFSS" flags, start, end, added dates, removed dates]
   patterns   one per distinct stop sequence of a route: { route, headsign, stops, trips }
              each trip is [service index, minutes after midnight at each stop...]
   footpaths  [from, to, walking minutes] between stops close enough to walk a transfer
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const feedDir = path.resolve(here, '..', process.argv[2] ?? '../../data/google_transit');
const outFile = path.resolve(here, '../data/timetable.json');

/** Transfers on foot up to this far (straight line). Longer walks are rarely worth it in winter. */
const FOOTPATH_METRES = 300;
/** Same walking model as the planner: straight-line distance × 1.3 for streets, at 80 m a minute. */
const walkMinutes = metres => Math.max(1, Math.ceil(metres * 1.3 / 80));

if (!fs.existsSync(path.join(feedDir, 'stop_times.txt'))) {
    console.error(`No GTFS feed in ${feedDir}. Unzip the Open Regina GTFS download there, or pass its folder.`);
    process.exit(1);
}

function splitCsvLine(line) {
    const cells = [];
    let cell = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (quoted) {
            if (c !== '"') cell += c;
            else if (line[i + 1] === '"') { cell += '"'; i++; }
            else quoted = false;
        } else if (c === '"') quoted = true;
        else if (c === ',') { cells.push(cell); cell = ''; }
        else cell += c;
    }
    cells.push(cell);
    return cells;
}

function readFeedFile(name) {
    const file = path.join(feedDir, name);
    if (!fs.existsSync(file)) return [];
    const lines = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
    const header = splitCsvLine(lines[0]).map(h => h.trim());
    return lines.slice(1).map(line => {
        const cells = splitCsvLine(line);
        return Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? '').trim()]));
    });
}

function metresBetween(aLat, aLng, bLat, bLng) {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (bLat - aLat) * rad, dLng = (bLng - aLng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

const minutesOf = hhmmss => { const [h, m] = hhmmss.split(':').map(Number); return h * 60 + m; };

// ── stops ──
const stops = readFeedFile('stops.txt')
    .filter(s => (s.location_type || '0') === '0')
    .map(s => [s.stop_id, s.stop_name, Number(Number(s.stop_lat).toFixed(6)), Number(Number(s.stop_lon).toFixed(6))]);
const stopIndex = new Map(stops.map((s, i) => [s[0], i]));

// ── services ──
const calendarDates = readFeedFile('calendar_dates.txt');
const serviceIds = new Set([...readFeedFile('calendar.txt').map(c => c.service_id), ...calendarDates.map(d => d.service_id)]);
const calendar = new Map(readFeedFile('calendar.txt').map(c => [c.service_id, c]));
const services = [...serviceIds].map(id => {
    const c = calendar.get(id);
    const flags = c ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(d => c[d] === '1' ? '1' : '0').join('') : '0000000';
    const dates = type => calendarDates.filter(d => d.service_id === id && d.exception_type === type).map(d => d.date).sort();
    return [id, flags, c?.start_date ?? '', c?.end_date ?? '', dates('1'), dates('2')];
});
const serviceIndex = new Map(services.map((s, i) => [s[0], i]));

// ── trips grouped into patterns ──
const routeName = new Map(readFeedFile('routes.txt').map(r => [r.route_id, r.route_short_name || r.route_id]));
const trips = new Map(readFeedFile('trips.txt').map(t => [t.trip_id, t]));

const callsByTrip = new Map();
for (const st of readFeedFile('stop_times.txt')) {
    if (!stopIndex.has(st.stop_id) || !st.departure_time) continue;
    let calls = callsByTrip.get(st.trip_id);
    if (!calls) callsByTrip.set(st.trip_id, calls = []);
    calls.push({ seq: Number(st.stop_sequence), stop: stopIndex.get(st.stop_id), time: minutesOf(st.departure_time) });
}

const patterns = new Map();
let skipped = 0;
for (const [tripId, calls] of callsByTrip) {
    const trip = trips.get(tripId);
    if (!trip || !serviceIndex.has(trip.service_id) || calls.length < 2) { skipped++; continue; }
    calls.sort((a, b) => a.seq - b.seq);
    const route = routeName.get(trip.route_id) ?? trip.route_id;
    const key = `${route}|${calls.map(c => c.stop).join(',')}`;
    let p = patterns.get(key);
    if (!p) patterns.set(key, p = { route, headsign: trip.trip_headsign || '', stops: calls.map(c => c.stop), trips: [] });
    p.trips.push([serviceIndex.get(trip.service_id), ...calls.map(c => c.time)]);
}
for (const p of patterns.values()) p.trips.sort((a, b) => a[1] - b[1]);

// ── footpaths between nearby stops, plus every pair the feed lists as a transfer ──
const footpaths = new Map();
const addPath = (a, b) => {
    if (a === b) return;
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    if (footpaths.has(key)) return;
    const m = metresBetween(stops[a][2], stops[a][3], stops[b][2], stops[b][3]);
    footpaths.set(key, [Math.min(a, b), Math.max(a, b), walkMinutes(m)]);
};
for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
        if (Math.abs(stops[i][2] - stops[j][2]) > 0.003) continue;   // ~330 m of latitude: skip the far ones cheaply
        if (metresBetween(stops[i][2], stops[i][3], stops[j][2], stops[j][3]) <= FOOTPATH_METRES) addPath(i, j);
    }
}
for (const t of readFeedFile('transfers.txt')) {
    if (stopIndex.has(t.from_stop_id) && stopIndex.has(t.to_stop_id)) addPath(stopIndex.get(t.from_stop_id), stopIndex.get(t.to_stop_id));
}

const starts = services.map(s => s[2]).filter(Boolean).sort(), ends = services.map(s => s[3]).filter(Boolean).sort();
const out = {
    version: 1,
    builtAt: new Date().toISOString(),
    feed: { start: starts[0] ?? '', end: ends.at(-1) ?? '' },
    stops,
    services,
    patterns: [...patterns.values()],
    footpaths: [...footpaths.values()],
};
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(out));
const tripCount = out.patterns.reduce((n, p) => n + p.trips.length, 0);
console.log(`Wrote ${path.relative(process.cwd(), outFile)}: ${stops.length} stops, ${out.patterns.length} patterns, ${tripCount} trips, ${out.footpaths.length} footpaths` +
    `${skipped ? `, ${skipped} trips skipped (no service or stops)` : ''}. Feed runs ${out.feed.start} to ${out.feed.end}.`);
