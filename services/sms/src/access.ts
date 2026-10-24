/**
 * Admins can switch text alerts off for one rider (admin panel → Person → Features → "Text alerts").
 * That writes public.feature_access (feature "sms_alerts", enabled false), which riders can read but
 * never write. No row means the rider may get texts.
 */
import { app, inChunks, must } from './db';

export const SMS_FEATURE = 'sms_alerts';

/** The riders among `ids` an admin has switched text alerts off for */
export async function smsRevoked(ids: string[]): Promise<Set<string>> {
    const rows = await inChunks([...new Set(ids)], async chunk =>
        must(await app().from('feature_access').select('user_id').eq('feature', SMS_FEATURE).eq('enabled', false).in('user_id', chunk), 'reading feature_access') as { user_id: string }[]);
    return new Set(rows.map(r => r.user_id));
}
