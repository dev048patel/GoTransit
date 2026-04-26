import { supabase } from '../lib/supabase';
import { DbWeeklySchedule } from '../transit/WeeklySchedule';

type UpsertRow = {
    fromDestId: string | null;
    toDestId: string | null;
    arriveBy: string;
    departBy: string | null;
    routeNum: string | null;
    routeTotalMinutes: number | null;
    enabled: boolean;
};

export const WeeklyScheduleService = {
    async getForUser(userId: string): Promise<DbWeeklySchedule[]> {
        const { data, error } = await supabase
            .from('weekly_schedules')
            .select('*')
            .eq('user_id', userId)
            .order('day_of_week');
        if (error) throw error;
        return data || [];
    },

    async getTodayForUser(userId: string): Promise<DbWeeklySchedule | null> {
        const { data, error } = await supabase
            .from('weekly_schedules')
            .select('*')
            .eq('user_id', userId)
            .eq('day_of_week', new Date().getDay())
            .eq('enabled', true)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async saveAll(userId: string, days: Map<number, UpsertRow>): Promise<void> {
        const rows = Array.from(days.entries()).map(([dayOfWeek, p]) => ({
            user_id: userId,
            day_of_week: dayOfWeek,
            from_dest_id: p.fromDestId,
            to_dest_id: p.toDestId,
            arrive_by: p.arriveBy,
            depart_by: p.departBy,
            route_num: p.routeNum,
            route_total_minutes: p.routeTotalMinutes,
            enabled: p.enabled,
        }));
        const { error } = await supabase
            .from('weekly_schedules')
            .upsert(rows, { onConflict: 'user_id,day_of_week' });
        if (error) throw error;
    },
};
