/**
 * Diagnostic: test checkStopDirection with Route 4 stops near Parliament Ave
 * This simulates what StopToRouteIndex.checkStopDirection does, to verify correctness.
 */
const gtfsShapes = require('./src/data/gtfsDirectionalShapes.json');
const gtfsStopRoutes = require('./src/data/gtfsStopRoutes.json');

// Route 4 directional shapes
const r4 = gtfsShapes['4'];
if (!r4) { console.error('Route 4 not found in gtfsDirectionalShapes.json'); process.exit(1); }
console.log('Route 4 directions:', Object.keys(r4));
console.log('Route 4 dir0 first 3 points:', r4['0']?.slice(0, 3));
console.log('Route 4 dir1 first 3 points:', r4['1']?.slice(0, 3));

// Show all stops with Route 4 near Parliament Ave (lat ~50.445, lng ~-104.6 to -104.65)
console.log('\nRoute 4 stops with directions:');
let r4Stops = [];
for (const [stopId, routes] of Object.entries(gtfsStopRoutes)) {
    if (routes['4']) {
        r4Stops.push({ stopId, dirs: routes['4'] });
    }
}
console.log(`Total Route 4 stops: ${r4Stops.length}`);
console.log('First 10:', r4Stops.slice(0, 10));

// Test projection: pick two stops and see if direction check works
// Stop IDs serving Route 4 in direction [0] only (EB)
const dir0Only = r4Stops.filter(s => JSON.stringify(s.dirs) === '[0]');
const dir1Only = r4Stops.filter(s => JSON.stringify(s.dirs) === '[1]');
const both = r4Stops.filter(s => s.dirs.includes(0) && s.dirs.includes(1));
console.log(`\nDir 0 only: ${dir0Only.length}, Dir 1 only: ${dir1Only.length}, Both: ${both.length}`);
console.log('Dir 0 sample:', dir0Only.slice(0, 3));
console.log('Dir 1 sample:', dir1Only.slice(0, 3));

// Now test: does the projection work for dir 0 stops?
// Project two dir0 stops onto dir0 shape and check if posA < posB
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6173e3, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function pointToSeg(pLat, pLon, aLat, aLon, bLat, bLon) {
    const cosLat = Math.cos(aLat*Math.PI/180), m = 111320;
    const px=(pLon-aLon)*m*cosLat, py=(pLat-aLat)*m;
    const bx=(bLon-aLon)*m*cosLat, by=(bLat-aLat)*m;
    const ab2=bx*bx+by*by; if(ab2===0) return Math.sqrt(px*px+py*py);
    const t=Math.max(0,Math.min(1,(px*bx+py*by)/ab2));
    return Math.sqrt((px-t*bx)**2+(py-t*by)**2);
}

const THRESH = 65;
function projectOntoLine(stopLat, stopLon, line) {
    // line is [[lat,lng], [lat,lng], ...] from GTFS
    let bestDist = Infinity, bestPos = -1, cum = 0;
    for (let i = 0; i < line.length-1; i++) {
        const [aLat, aLon] = line[i], [bLat, bLon] = line[i+1];
        const seg = haversine(aLat, aLon, bLat, bLon);
        const d = pointToSeg(stopLat, stopLon, aLat, aLon, bLat, bLon);
        if (d < bestDist && d <= THRESH) {
            bestDist = d;
            const cosLat=Math.cos(aLat*Math.PI/180), m=111320;
            const px=(stopLon-aLon)*m*cosLat, py=(stopLat-aLat)*m;
            const bx=(bLon-aLon)*m*cosLat, by=(bLat-aLat)*m;
            const ab2=bx*bx+by*by;
            const t=ab2===0?0:Math.max(0,Math.min(1,(px*bx+py*by)/ab2));
            bestPos = cum + t*seg;
        }
        cum += seg;
    }
    return { pos: bestPos, dist: bestDist };
}

// Test with actual stops near our area - pick 2 Route 4 dir0 stops
// We'll hardcode some stop IDs based on what we know are Route 4 stops
console.log('\n--- Testing projection on dir0 shape ---');
const dir0Shape = r4['0'];
console.log(`Dir0 shape start: lat=${dir0Shape[0][0]}, lng=${dir0Shape[0][1]}`);
console.log(`Dir0 shape end: lat=${dir0Shape[dir0Shape.length-1][0]}, lng=${dir0Shape[dir0Shape.length-1][1]}`);

// Test with first two dir-0-only stops
if (dir0Only.length >= 2) {
    const s1id = dir0Only[0].stopId, s2id = dir0Only[1].stopId;
    console.log(`Testing stops ${s1id} → ${s2id}`);
    // We need their LAT/LON from transitStops... hardcode some known ones
    // Route 4 on Parliament Ave: look up some stops we know
}

// Show sample Route 4 stop coordinates from gtfsStopRoutes perspective
// Actually, let's print all Route 4 stops and their GTFS dirs
console.log('\nAll Route 4 stop IDs and directions (first 20):');
r4Stops.slice(0, 20).forEach(s => console.log(`  ${s.stopId}: ${JSON.stringify(s.dirs)}`));
