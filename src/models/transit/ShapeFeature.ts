/**
 * ShapeFeature
 * A single GeoJSON feature from transitShapes.json representing one route's road geometry.
 * Used by StopToRouteIndex when projecting stops onto route shapes for direction detection.
 */
export interface ShapeFeature {
    type: string;
    geometry: {
        type: string;
        coordinates: number[][][]; // MultiLineString: array of lines, each line is array of [lng, lat]
    };
    properties: {
        ROUTE_NAME: string;
        ROUTE_NUM: string;
        ROUTE_ID: string;
        SHAPE_ID: string;
        [key: string]: any;
    };
}
