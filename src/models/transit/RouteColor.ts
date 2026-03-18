/* Type definition for route color data — maps route IDs to their display colours and sort order */
export interface RouteColor {
    route_id: number;
    sort_order: number;
    name: string;
    colour: string;
    text_color: string;
    stop_days: string;
    disabled: number;
    proposed: number;
}
