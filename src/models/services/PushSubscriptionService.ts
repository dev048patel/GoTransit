import { supabase } from '../lib/supabase';

export interface PushSubJSON {
    endpoint: string;
    keys: { p256dh: string; auth: string };
}

export const PushSubscriptionService = {
    async save(userId: string, sub: PushSubJSON): Promise<void> {
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert(
                { user_id: userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth_key: sub.keys.auth },
                { onConflict: 'user_id,endpoint' }
            );
        if (error) throw error;
    },

    async remove(userId: string, endpoint: string): Promise<void> {
        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('endpoint', endpoint);
        if (error) throw error;
    },
};
