/**
 * @file Route.ts
 * @description Data definitions for Transit Routes.
 */

export interface Route {
    ROUTE_NAME: string;
    ROUTE_NUM: string;
    ROUTE_ID: string; // Acts as the unique identifier
    SHAPE_ID: string;
    ROUTE_COLO: string; // Route Color (often hex)
    ROUTE_TEXT: string; // Text Color
    SHAPE_LEN: number | null;
}
