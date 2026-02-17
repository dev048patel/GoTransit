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