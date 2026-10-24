/**
 * SmsAccessService — who may get text alerts.
 *
 * Text alerts are on for everyone unless an admin switches them off for a person (admin panel →
 * Person → Features → "Text Alerts"). That is a feature_access row (feature "sms_alerts", enabled
 * false), which riders can read but only the backend can write. The SMS service
 * (services/sms/src/access.ts) checks the same row before it plans or sends anything.
 */
import { serviceDb } from '../lib/serverDb';
import type { FeatureKey } from '../admin/FeatureAccessTypes';

export const SMS_FEATURE: FeatureKey = 'sms_alerts';

/** The people among `ids` an admin has switched text alerts off for. Throws if it can't tell. */
export async function smsRevokedIds(ids: string[]): Promise<Set<string>> {
    const unique = [...new Set(ids)];
    const revoked = new Set<string>();
    for (let i = 0; i < unique.length; i += 150) {
        const { data, error } = await serviceDb().from('feature_access').select('user_id')
            .eq('feature', SMS_FEATURE).eq('enabled', false).in('user_id', unique.slice(i, i + 150));
        if (error) throw new Error(`Could not read text alert access: ${error.message}`);
        for (const r of data ?? []) revoked.add(r.user_id as string);
    }
    return revoked;
}
