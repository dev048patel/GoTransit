/**
 * @file RouteColor.ts
 * @description Data definitions for Transit Route Colors.
 */

export interface RouteColor {
    route_id: number;
    sort_order: number;
    name: string;
    colour: string;     // Hex code (e.g. "#46B9A2")
    text_color: string; // Hex code (e.g. "#000000")
    stop_days: string;
    disabled: number;
    proposed: number;
}
