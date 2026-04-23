import { supabase } from '../lib/supabase';
import { DbTripSchedule, DbTripLeg } from '../transit/TripSchedule';

export const TripScheduleService = {
    async create(
        userId: string,
        name: string,
        startDate: string,
        endDate: string,
    ): Promise<DbTripSchedule> {
        const { data, error } = await supabase
            .from('trip_schedules')
            .insert({ user_id: userId, name, start_date: startDate, end_date: endDate })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async saveLegs(legs: Omit<DbTripLeg, 'id'>[]): Promise<void> {
        if (legs.length === 0) return;
        const { error } = await supabase.from('trip_schedule_legs').insert(legs);
        if (error) throw error;
    },

    async deleteLegs(scheduleId: string): Promise<void> {
        const { error } = await supabase
            .from('trip_schedule_legs')
            .delete()
            .eq('schedule_id', scheduleId);
        if (error) throw error;
    },
};
