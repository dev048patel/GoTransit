/**
 * verifyProjection.js
 * Tests whether stops 0251 and 1566 project correctly onto Route 18 dir-1 shape.
 * Also checks transitStops LAT/LON for these stops.
 */
const gtfsShapes = require('../src/data/gtfsDirectionalShapes.json');
const gtfsStopRoutes = require('../src/data/gtfsStopRoutes.json');

// Route 18 dir-1 shape (GTFS stores [lat, lng])
const r18dir1 = gtfsShapes['18']['1']; // [lat, lng][]
const r18dir0 = gtfsShapes['18']['0'];

console.log('Route 18 dir0: starts', r18dir0[0], 'ends', r18dir0[r18dir0.length-1]);
console.log('Route 18 dir1: starts', r18dir1[0], 'ends', r18dir1[r18dir1.length-1]);

// Stop coordinates from transitStops (we'll approximate from the data)
// 0251: direction [1] on Route 18 - let's read from the ts file via grep
// Since transitStops.ts is TS, we'll use a known coordinate

// We need to find stop LAT/LON from transitStops.ts
// Let's use fs to grep for the stop IDs
const fs = require('fs');
const content = fs.readFileSync('./src/data/transitStops.ts', 'utf8');

function findStop(stopId) {
    const idx = content.indexOf(`"${stopId}"`);
    if (idx === -1) return null;
    const block = content.slice(idx, idx + 300);
    const lat = block.match(/"LAT":\s*"([^"]+)"/);
    const lon = block.match(/"LON":\s*"([^"]+)"/);
    const name = block.match(/"STOP_NAME":\s*"([^"]+)"/);
    return lat && lon ? { lat: parseFloat(lat[1]), lon: parseFloat(lon[1]), name: name?.[1] } : null;
}

const stop0251 = findStop('0251');
const stop0268 = findStop('0268');
const stop1566 = findStop('1566');
const stop0269 = findStop('0269');

console.log('\nStop coordinates:');
console.log('0251:', stop0251);
console.log('0268:', stop0268);
console.log('1566:', stop1566);
console.log('0269:', stop0269);

// Now project stops onto dir-1 shape (GTFS [lat,lng] → projection expects [lng,lat])
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function ptSegDist(pLat, pLon, aLat, aLon, bLat, bLon) {
    const cosLat = Math.cos(aLat * Math.PI / 180), m = 111320;
    const px = (pLon - aLon) * m * cosLat, py = (pLat - aLat) * m;
    const bx = (bLon - aLon) * m * cosLat, by = (bLat - aLat) * m;
    const ab2 = bx*bx + by*by;
    if (ab2 === 0) return Math.sqrt(px*px + py*py);
    const t = Math.max(0, Math.min(1, (px*bx + py*by) / ab2));
    return Math.sqrt((px - t*bx)**2 + (py - t*by)**2);
}

function projectOntoLine(stopLat, stopLon, line, threshold) {
    // line is GTFS [lat, lng][] - need to read as [lat, lng]
    let bestDist = Infinity, bestPos = -1, cumLen = 0;
    for (let i = 0; i < line.length - 1; i++) {
        const [aLat, aLon] = line[i];  // GTFS: [lat, lng]
        const [bLat, bLon] = line[i+1];
        const seg = haversine(aLat, aLon, bLat, bLon);
        const d = ptSegDist(stopLat, stopLon, aLat, aLon, bLat, bLon);
        if (d < bestDist && d <= threshold) {
            bestDist = d;
            const cosLat = Math.cos(aLat * Math.PI / 180), m = 111320;
            const px = (stopLon - aLon) * m * cosLat, py = (stopLat - aLat) * m;
            const bx = (bLon - aLon) * m * cosLat, by = (bLat - aLat) * m;
            const ab2 = bx*bx + by*by;
            const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, (px*bx+py*by)/ab2));
            bestPos = cumLen + t * seg;
        }
        cumLen += seg;
    }
    return { pos: bestPos, dist: bestPos >= 0 ? bestDist : Infinity };
}

const THRESHOLD = 150;
for (const dir of ['0', '1']) {
    const line = gtfsShapes['18'][dir];  // [lat,lng][]
    console.log(`\n--- Route 18 dir${dir} (${line.length} pts, threshold ${THRESHOLD}m) ---`);
    for (const [id, stop] of [['0251', stop0251], ['0268', stop0268], ['1566', stop1566], ['0269', stop0269]]) {
        if (!stop) { console.log(`  ${id}: NOT FOUND`); continue; }
        const r = projectOntoLine(stop.lat, stop.lon, line, THRESHOLD);
        console.log(`  ${id} "${stop.name}": pos=${r.pos >= 0 ? Math.round(r.pos)+'m' : 'MISS ('+Math.round(r.dist)+'m away)'}`);
    }
}

// Now check: for pair 0251→1566 on dir1, is posA < posB?
if (stop0251 && stop1566) {
    const pA = projectOntoLine(stop0251.lat, stop0251.lon, r18dir1, THRESHOLD);
    const pB = projectOntoLine(stop1566.lat, stop1566.lon, r18dir1, THRESHOLD);
    console.log(`\nCritical check: 0251→1566 on dir1:`);
    console.log(`  posA(0251)=${pA.pos >= 0 ? Math.round(pA.pos)+'m' : 'MISS'}, posB(1566)=${pB.pos >= 0 ? Math.round(pB.pos)+'m' : 'MISS'}`);
    if (pA.pos >= 0 && pB.pos >= 0) {
        console.log(`  posA < posB? ${pA.pos < pB.pos} → ${pA.pos < pB.pos ? 'VALID ✓' : 'INVALID ✗'}`);
    }
}
if (stop0268 && stop1566) {
    const pA = projectOntoLine(stop0268.lat, stop0268.lon, r18dir1, THRESHOLD);
    const pB = projectOntoLine(stop1566.lat, stop1566.lon, r18dir1, THRESHOLD);
    console.log(`\nCritical check: 0268→1566 on dir1:`);
    console.log(`  posA(0268)=${pA.pos >= 0 ? Math.round(pA.pos)+'m' : 'MISS'}, posB(1566)=${pB.pos >= 0 ? Math.round(pB.pos)+'m' : 'MISS'}`);
    if (pA.pos >= 0 && pB.pos >= 0) {
        console.log(`  posA < posB? ${pA.pos < pB.pos} → ${pA.pos < pB.pos ? 'VALID ✓' : 'INVALID ✗'}`);
    }
}
