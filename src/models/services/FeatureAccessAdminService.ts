import { supabase } from '../lib/supabase';
import { FeatureKey, UserAccessRecord, FEATURES } from '../admin/FeatureAccessTypes';

const FEATURE_KEYS = FEATURES.map(f => f.key);
const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

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

/** Admin: set a single feature flag for a user (routes through backend to bypass RLS) */
export async function setFeatureAccess(
    userId: string,
    feature: FeatureKey,
    enabled: boolean,
    adminId: string,
): Promise<void> {
    const resp = await fetch(`${BASE_URL}/api/admin/fac/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, feature, enabled, adminId }),
    });
    if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${resp.status}`);
    }
}

/** Admin: delete all restriction rows for a user (resets to full access) */
export async function resetUserAccess(userId: string): Promise<void> {
    const resp = await fetch(`${BASE_URL}/api/admin/fac/reset/${userId}`, { method: 'DELETE' });
    if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${resp.status}`);
    }
}

/** Admin: toggle a feature for ALL users at once */
export async function setFeatureForAll(
    feature: FeatureKey,
    enabled: boolean,
    adminId: string,
    allUserIds: string[],
): Promise<void> {
    const resp = await fetch(`${BASE_URL}/api/admin/fac/set-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, enabled, adminId, userIds: allUserIds }),
    });
    if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${resp.status}`);
    }
}
