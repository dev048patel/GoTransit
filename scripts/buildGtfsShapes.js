/**
 * buildGtfsShapes.js
 * Generates gtfsDirectionalShapes.json from GTFS shapes.txt + trips.txt + routes.txt
 *
 * Output structure:
 * {
 *   "4": {
 *     "0": [[lat,lng], [lat,lng], ...],   // Route 4 direction 0 (outbound)
 *     "1": [[lat,lng], ...]               // Route 4 direction 1 (inbound)
 *   },
 *   ...
 * }
 *
 * For routes with multiple trips per direction, picks the longest shape_id (most stops).
 */

const fs = require('fs');
const path = require('path');

const GTFS_DIR = path.join(__dirname, '..', 'gtfs_temp');
const OUT_FILE = path.join(__dirname, '..', 'src', 'data', 'gtfsDirectionalShapes.json');

function parseCsv(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.trim().split('\n').map(l => l.replace(/\r$/, ''));
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        // Handle quoted fields
        const values = [];
        let inQuote = false;
        let cur = '';
        for (const ch of line) {
            if (ch === '"') { inQuote = !inQuote; }
            else if (ch === ',' && !inQuote) { values.push(cur); cur = ''; }
            else { cur += ch; }
        }
        values.push(cur);
        const obj = {};
        headers.forEach((h, i) => { obj[h.trim()] = (values[i] || '').trim(); });
        return obj;
    });
}

console.log('Reading GTFS files...');
const routes = parseCsv(path.join(GTFS_DIR, 'routes.txt'));
const trips = parseCsv(path.join(GTFS_DIR, 'trips.txt'));
const shapePts = parseCsv(path.join(GTFS_DIR, 'shapes.txt'));

console.log(`Routes: ${routes.length}, Trips: ${trips.length}, Shape points: ${shapePts.length}`);

// Build route_id → route_short_name (route number)
const routeIdToNum = {};
for (const r of routes) {
    routeIdToNum[r.route_id] = r.route_short_name;
}

// For each trip, record: routeNum + direction_id → shape_id
// Multiple trips may share shape_id. Track all shape_ids per (routeNum, dir) and pick the one with most points.
const routeDirShapeCount = {}; // key: "routeNum|dir|shapeId" → point count (filled later)
const routeDirShapes = {}; // key: "routeNum|dir" → Set of shapeIds

for (const trip of trips) {
    const routeNum = routeIdToNum[trip.route_id];
    if (!routeNum) continue;
    const dir = trip.direction_id; // "0" or "1"
    const shapeId = trip.shape_id;
    if (!shapeId) continue;

    const key = `${routeNum}|${dir}`;
    if (!routeDirShapes[key]) routeDirShapes[key] = new Set();
    routeDirShapes[key].add(shapeId);
}

// Build shapeId → sorted array of [lat, lng]
console.log('Building shape coordinate arrays...');
const shapePoints = {}; // shapeId → [{seq, lat, lng}]
for (const pt of shapePts) {
    const sid = pt.shape_id;
    if (!shapePoints[sid]) shapePoints[sid] = [];
    shapePoints[sid].push({
        seq: parseInt(pt.shape_pt_sequence),
        lat: parseFloat(pt.shape_pt_lat),
        lng: parseFloat(pt.shape_pt_lon)
    });
}
// Sort each shape by sequence
for (const sid of Object.keys(shapePoints)) {
    shapePoints[sid].sort((a, b) => a.seq - b.seq);
}

// For each (routeNum, dir) pick the shape_id with the most points (most detailed path)
console.log('Selecting best shape per route direction...');
const result = {};

for (const [key, shapeIds] of Object.entries(routeDirShapes)) {
    const [routeNum, dir] = key.split('|');

    let bestShapeId = null;
    let bestCount = 0;
    for (const sid of shapeIds) {
        const pts = shapePoints[sid];
        if (pts && pts.length > bestCount) {
            bestCount = pts.length;
            bestShapeId = sid;
        }
    }

    if (!bestShapeId) continue;

    const coords = shapePoints[bestShapeId].map(p => [p.lat, p.lng]);
    if (!result[routeNum]) result[routeNum] = {};
    result[routeNum][dir] = coords;
}

// Summary
const routeNums = Object.keys(result).sort((a, b) => parseInt(a) - parseInt(b));
console.log(`\nDirectional shapes generated for ${routeNums.length} routes:`);
for (const rn of routeNums) {
    const dirs = Object.keys(result[rn]);
    const pts = dirs.map(d => `dir${d}:${result[rn][d].length}pts`).join(', ');
    console.log(`  Route ${rn}: ${pts}`);
}

fs.writeFileSync(OUT_FILE, JSON.stringify(result));
console.log(`\nWrote ${OUT_FILE}`);
