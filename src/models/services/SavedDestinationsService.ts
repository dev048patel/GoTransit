import { supabase } from '../lib/supabase';
import { SavedDestination } from '../transit/SavedDestination';

type NewDestination = Omit<SavedDestination, 'id' | 'user_id' | 'created_at'>;

export const SavedDestinationsService = {
    async getAll(userId: string): Promise<SavedDestination[]> {
        const { data, error } = await supabase
            .from('saved_destinations')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async add(userId: string, dest: NewDestination): Promise<SavedDestination> {
        const { data, error } = await supabase
            .from('saved_destinations')
            .insert({ user_id: userId, ...dest })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async remove(id: string): Promise<void> {
        const { error } = await supabase
            .from('saved_destinations')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },
};
