import { supabase } from '../lib/supabase';
import { FeatureKey, UserAccessRecord, FEATURES } from '../admin/FeatureAccessTypes';

const FEATURE_KEYS = FEATURES.map(f => f.key);

/** Admin: get all users with their access flags merged */
export async function getAllUsersWithAccess(): Promise<UserAccessRecord[]> {
    const [profilesResult, accessResult] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name').order('email'),
        supabase.from('feature_access').select('user_id, feature, enabled'),
    ]);

    const profiles = profilesResult.data ?? [];
    const accessRows = accessResult.data ?? [];

    return profiles.map(p => {
        const access = Object.fromEntries(FEATURE_KEYS.map(k => [k, true])) as Record<FeatureKey, boolean>;
        for (const row of accessRows) {
            if (row.user_id === p.id && FEATURE_KEYS.includes(row.feature)) {
                access[row.feature as FeatureKey] = row.enabled;
            }
        }
        return {
            userId: p.id,
            email: p.email ?? '(no email)',
            fullName: p.full_name ?? null,
            access,
        };
    });
}

/** Admin: set a single feature flag for a user */
export async function setFeatureAccess(
    userId: string,
    feature: FeatureKey,
    enabled: boolean,
    adminId: string,
): Promise<void> {
    const { error } = await supabase
        .from('feature_access')
        .upsert(
            { user_id: userId, feature, enabled, updated_by: adminId, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,feature' },
        );
    if (error) throw error;
}

/** Admin: delete all restriction rows for a user (resets to full access) */
export async function resetUserAccess(userId: string): Promise<void> {
    const { error } = await supabase
        .from('feature_access')
        .delete()
        .eq('user_id', userId);
    if (error) throw error;
}

/**
 * Admin: toggle a feature for ALL users.
 * Enable  → delete all rows for that feature (no row = enabled by default).
 * Disable → upsert a disabled row for every user in the profiles table.
 */
export async function setFeatureForAll(
    feature: FeatureKey,
    enabled: boolean,
    adminId: string,
    allUserIds: string[],
): Promise<void> {
    if (enabled) {
        const { error } = await supabase
            .from('feature_access')
            .delete()
            .eq('feature', feature);
        if (error) throw error;
    } else {
        const rows = allUserIds.map(userId => ({
            user_id: userId,
            feature,
            enabled: false,
            updated_by: adminId,
            updated_at: new Date().toISOString(),
        }));
        const { error } = await supabase
            .from('feature_access')
            .upsert(rows, { onConflict: 'user_id,feature' });
        if (error) throw error;
    }
}
