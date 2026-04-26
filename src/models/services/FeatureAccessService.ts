import { supabase } from '../lib/supabase';
import { FeatureKey, FEATURES } from '../admin/FeatureAccessTypes';

const FEATURE_KEYS = FEATURES.map(f => f.key);

/** Browser-side: fetch access flags for the current user (defaults all to true if no rows) */
export async function getUserFeatureAccess(userId: string): Promise<Record<FeatureKey, boolean>> {
    const defaults = Object.fromEntries(FEATURE_KEYS.map(k => [k, true])) as Record<FeatureKey, boolean>;

    const { data } = await supabase
        .from('feature_access')
        .select('feature, enabled')
        .eq('user_id', userId);

    if (!data?.length) return defaults;

    const result = { ...defaults };
    for (const row of data) {
        if (FEATURE_KEYS.includes(row.feature)) {
            result[row.feature as FeatureKey] = row.enabled;
        }
    }
    return result;
}
