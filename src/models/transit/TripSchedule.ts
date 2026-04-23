import { TripOption } from './RoutePlanning';

export interface TripScheduleDay {
    dayIndex: number;
    fromId: string | null;
    toId: string | null;
    arriveBy: string;
    options: TripOption[];
    selectedIndex: number | null;
    calculating: boolean;
    calcError: string;
}

export interface DbTripSchedule {
    id: string;
    user_id: string;
    name: string;
    start_date: string;
    end_date: string;
    created_at: string;
}

export interface DbTripLeg {
    id?: string;
    schedule_id: string;
    day_index: number;
    from_name: string;
    from_lat: number;
    from_lng: number;
    to_name: string;
    to_lat: number;
    to_lng: number;
    arrive_by: string;
    route_summary: {
        routeNums: string[];
        totalTime: number;
        departBy: string;
        transfers: number;
    } | null;
}

export function computeDepartBy(arriveBy: string, totalMinutes: number): string {
    const [h, m] = arriveBy.split(':').map(Number);
    const raw = h * 60 + m - totalMinutes;
    const adj = ((raw % 1440) + 1440) % 1440;
    const hh = Math.floor(adj / 60);
    const mm = adj % 60;
    return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

export function makeDayLabel(startDate: string, dayIndex: number): string {
    const d = new Date(startDate + 'T00:00:00');
    d.setDate(d.getDate() + dayIndex);
    return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}
