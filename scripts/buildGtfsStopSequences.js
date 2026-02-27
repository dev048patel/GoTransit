/**
 * buildGtfsStopSequences.js
 *
 * Reads GTFS stop_times.txt + trips.txt to produce an authoritative
 * ordered stop sequence for every route+direction combination.
 *
 * Output: src/data/gtfsStopSequences.json
 * Structure:
 * {
 *   "18": {
 *     "0": ["0268", "0269", "0251", ...],   // Route 18 dir 0, ordered stop IDs
 *     "1": ["1566", "0251", "0269", ...]    // Route 18 dir 1
 *   },
 *   ...
 * }
 *
 * Strategy: for each (routeNum, directionId) pick the representative trip
 * that has the MOST stops (covers the longest variant of that direction),
 * then output its stop_ids sorted by stop_sequence.
 */

const fs = require('fs');
const path = require('path');

const GTFS_DIR = path.join(__dirname, '..', 'gtfs_temp');
const OUT_FILE = path.join(__dirname, '..', 'src', 'data', 'gtfsStopSequences.json');

// ─── Minimal CSV parser ───────────────────────────────────────────────────────
function parseCsv(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.trim().split('\n').map(l => l.replace(/\r$/, ''));
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = [];
        let inQuote = false, cur = '';
        for (const ch of line) {
            if (ch === '"') { inQuote = !inQuote; }
            else if (ch === ',' && !inQuote) { values.push(cur); cur = ''; }
            else { cur += ch; }
        }
        values.push(cur);
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (values[i] || '').trim(); });
        return obj;
    });
}

console.log('Reading GTFS files...');
const routesCsv  = parseCsv(path.join(GTFS_DIR, 'routes.txt'));
const tripsCsv   = parseCsv(path.join(GTFS_DIR, 'trips.txt'));
const stopTimesCsv = parseCsv(path.join(GTFS_DIR, 'stop_times.txt'));

console.log(`Routes: ${routesCsv.length}, Trips: ${tripsCsv.length}, Stop-times: ${stopTimesCsv.length}`);

// ─── Step 1: route_id → route_short_name (route number) ──────────────────────
const routeIdToNum = {};
for (const r of routesCsv) {
    routeIdToNum[r.route_id] = r.route_short_name;
}

// ─── Step 2: trip_id → { routeNum, directionId } ─────────────────────────────
const tripMeta = {}; // tripId → { routeNum, dir }
for (const t of tripsCsv) {
    const routeNum = routeIdToNum[t.route_id];
    if (!routeNum) continue;
    tripMeta[t.trip_id] = { routeNum, dir: t.direction_id };
}

// ─── Step 3: group stop_times by trip, build ordered stop list per trip ───────
console.log('Grouping stop times by trip...');
const tripStops = {}; // tripId → [{ seq, stopId }]

for (const st of stopTimesCsv) {
    const tid = st.trip_id;
    if (!tripMeta[tid]) continue; // trip not in our route set
    if (!tripStops[tid]) tripStops[tid] = [];
    tripStops[tid].push({
        seq: parseInt(st.stop_sequence, 10),
        stopId: st.stop_id
    });
}

// Sort each trip's stops by stop_sequence
for (const tid of Object.keys(tripStops)) {
    tripStops[tid].sort((a, b) => a.seq - b.seq);
}

// ─── Step 4: For each (routeNum, dir), pick the trip with the most stops ──────
// "Most stops" = best coverage of all route variants on that direction.
console.log('Selecting representative trip per route+direction...');

const bestTrip = {}; // key: "routeNum|dir" → { tripId, stopCount }

for (const [tripId, meta] of Object.entries(tripMeta)) {
    const stops = tripStops[tripId];
    if (!stops) continue;
    const key = `${meta.routeNum}|${meta.dir}`;
    const existing = bestTrip[key];
    if (!existing || stops.length > existing.stopCount) {
        bestTrip[key] = { tripId, stopCount: stops.length };
    }
}

// ─── Step 5: Build output structure ──────────────────────────────────────────
const result = {}; // routeNum → { dir → string[] }

for (const [key, { tripId }] of Object.entries(bestTrip)) {
    const [routeNum, dir] = key.split('|');
    const stops = tripStops[tripId];
    if (!stops) continue;

    if (!result[routeNum]) result[routeNum] = {};
    result[routeNum][dir] = stops.map(s => s.stopId);
}

// ─── Summary ──────────────────────────────────────────────────────────────────
const routeNums = Object.keys(result).sort((a, b) => parseInt(a) - parseInt(b));
console.log(`\nStop sequences generated for ${routeNums.length} routes:`);
for (const rn of routeNums) {
    const dirs = Object.keys(result[rn]).sort();
    const info = dirs.map(d => `dir${d}:${result[rn][d].length}stops`).join(', ');
    console.log(`  Route ${rn}: ${info}`);
}

fs.writeFileSync(OUT_FILE, JSON.stringify(result));
console.log(`\nWrote ${OUT_FILE}`);
