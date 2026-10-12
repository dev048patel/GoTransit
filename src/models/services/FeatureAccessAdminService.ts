import { supabase } from '../lib/supabase';
import { apiPost, apiDelete } from '../lib/apiClient';
import { FeatureKey, UserAccessRecord, FEATURES } from '../admin/FeatureAccessTypes';

const FEATURE_KEYS = FEATURES.map(f => f.key);

/** Admin: get all users with their access flags merged (read-only, RLS allows this) */
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

/** Admin: set a single feature flag for a user (the backend checks the caller is an admin and records who did it) */
export async function setFeatureAccess(userId: string, feature: FeatureKey, enabled: boolean, _adminId?: string): Promise<void> {
    await apiPost('/api/admin/fac/set', { userId, feature, enabled });
}

/** Admin: delete all restriction rows for a user (resets to full access) */
export async function resetUserAccess(userId: string): Promise<void> {
    await apiDelete(`/api/admin/fac/reset/${userId}`);
}

/** Admin: toggle a feature for ALL users at once */
export async function setFeatureForAll(feature: FeatureKey, enabled: boolean, _adminId: string | undefined, allUserIds: string[]): Promise<void> {
    await apiPost('/api/admin/fac/set-all', { feature, enabled, userIds: allUserIds });
}
