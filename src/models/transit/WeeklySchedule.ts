export interface DayPlan {
    fromId: string | null;
    toId: string | null;
    arriveBy: string;
    departBy: string | null;          // computed: arriveBy - routeTotalMinutes
    routeNum: string | null;          // pinned route number
    routeTotalMinutes: number | null; // stored so reminder can recalculate if needed
    enabled: boolean;                 // whether to send departure reminders on this day
}

export interface DbWeeklySchedule {
    id: string;
    user_id: string;
    day_of_week: number;              // 0=Sun, 1=Mon … 6=Sat
    from_dest_id: string | null;
    to_dest_id: string | null;
    arrive_by: string;
    depart_by: string | null;
    route_num: string | null;
    route_total_minutes: number | null;
    enabled: boolean;
    created_at: string;
}

export const DAY_LABELS: Record<number, string> = {
    1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri',
};

export const WEEKDAY_INDICES = [1, 2, 3, 4, 5];

export function blankDay(): DayPlan {
    return {
        fromId: null, toId: null,
        arriveBy: '09:00', departBy: null,
        routeNum: null, routeTotalMinutes: null,
        enabled: false,
    };
}
