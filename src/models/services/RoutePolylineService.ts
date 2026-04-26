/*
 RoutePolylineService
 Loads per-route polyline snapshots from src/newData/polyline_data/.
 File format: { type: "LineString", coordinates: [[lat, lng], ...], style: {...} }
*/

interface RoutePolylineFile {
    type: 'LineString';
    coordinates: [number, number][]; // [lat, lng]
    style?: { color?: string; opacity?: number; clickable?: string | boolean };
}

// Vite eagerly bundles every route_*_polyline.json file at build time.
const polylineFiles = import.meta.glob<RoutePolylineFile>(
    '../../newData/polyline_data/route_*_polyline.json',
    { eager: true, import: 'default' }
);

const routePolylineMap: Map<string, RoutePolylineFile> = (() => {
    const map = new Map<string, RoutePolylineFile>();
    for (const [path, data] of Object.entries(polylineFiles)) {
        const match = path.match(/route_(\d+)_polyline\.json$/);
        if (match) map.set(match[1], data);
    }
    return map;
})();

export class RoutePolylineService {
    /**
     * Returns the polyline as a single path (array of {lat,lng}) wrapped in an array
     * for compatibility with consumers that expect multiple lines (e.g. MultiLineString).
     */
    static getRoutePaths(routeNum: string): { lat: number; lng: number }[][] {
        const data = routePolylineMap.get(routeNum);
        if (!data || !data.coordinates) return [];
        const path = data.coordinates.map(([lat, lng]) => ({ lat, lng }));
        return path.length >= 2 ? [path] : [];
    }
}
