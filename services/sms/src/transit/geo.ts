/** Straight-line distance in metres */
export function metresBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (bLat - aLat) * rad, dLng = (bLng - aLng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Walking time without a paid directions call: straight line × 1.3 for the street grid, at 80 m a
 * minute (4.8 km/h). The same model builds the footpaths in scripts/build-timetable.mjs.
 */
export function walkMinutes(metres: number): number {
    return Math.max(1, Math.ceil(metres * 1.3 / 80));
}
