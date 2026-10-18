import { supabase } from '../lib/supabase';
import { SavedDestination } from '../transit/SavedDestination';
import { PlacesService } from './PlacesService';

type NewDestination = Omit<SavedDestination, 'id' | 'user_id' | 'created_at' | 'cached_at'>;

/* Google's Places terms let an app keep a place's ID for good, but its coordinates only for up to
   30 days. So each saved place keeps the rider's own label and Google's place ID permanently, and its
   coordinates and address only as a copy that is refreshed from Google once it is 30 days old. */
const REFRESH_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

async function refreshIfStale(dest: SavedDestination): Promise<SavedDestination> {
    const fetchedAt = Date.parse(dest.cached_at ?? dest.created_at);
    if (!dest.place_id || Date.now() - fetchedAt < REFRESH_AFTER_MS) return dest;
    try {
        const fresh = await PlacesService.getLocationAndAddress(dest.place_id);
        // cached_at is written only once its column exists (009_saved_places_refresh.sql)
        const update = 'cached_at' in dest ? { ...fresh, cached_at: new Date().toISOString() } : fresh;
        await supabase.from('saved_destinations').update(update).eq('id', dest.id);
        return { ...dest, ...update };
    } catch {
        // ponytail: if Google can't be reached the old copy is used and refreshed on the next load; clear it after a hard failure if strict compliance matters
        return dest;
    }
}

export const SavedDestinationsService = {
    async getAll(userId: string): Promise<SavedDestination[]> {
        const { data, error } = await supabase
            .from('saved_destinations')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return Promise.all((data || []).map(refreshIfStale));
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
