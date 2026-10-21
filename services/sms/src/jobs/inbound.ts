/**
 * Texts riders send back. Twilio's own opt-out handling also answers STOP/START itself; mirroring
 * them here keeps profiles.sms_opted_in, which the app and the planner read, in step.
 *
 *   STOP, UNSUBSCRIBE, CANCEL, END, QUIT, STOPALL   opt out, and cancel today's remaining alerts
 *   START, UNSTOP, YES                               opt back in
 *   HELP, INFO                                       what these texts are
 */
import { app, sms } from '../db';
import { HELP_TEXT } from '../alerts/messages';
import { reginaDate } from '../time';

const STOP = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);
const START = new Set(['START', 'UNSTOP', 'YES']);
const HELP = new Set(['HELP', 'INFO']);

/** The reply to send back in the TwiML response, or null for none */
export async function handleInbound(from: string, rawBody: string, now = Date.now()): Promise<string | null> {
    const word = rawBody.trim().toUpperCase().replace(/[^A-Z]/g, '');
    const { data: people } = await app().from('profiles').select('id, sms_opted_in').eq('mobile_number', from);
    const ids = (people ?? []).map(p => p.id as string);

    if (STOP.has(word)) {
        if (ids.length) {
            await app().from('profiles').update({ sms_opted_in: false }).in('id', ids);
            await cancelToday(ids, reginaDate(now));
        }
        return null;
    }
    if (START.has(word)) {
        if (ids.length) await app().from('profiles').update({ sms_opted_in: true, sms_consent_at: new Date(now).toISOString() }).in('id', ids);
        return null;
    }
    if (HELP.has(word)) return HELP_TEXT;
    return null;
}

async function cancelToday(userIds: string[], date: string): Promise<void> {
    const stamp = new Date().toISOString();
    await sms().from('alerts').update({ status: 'skipped', updated_at: stamp }).in('user_id', userIds).eq('service_date', date).eq('status', 'pending');
    await sms().from('trip_plans').update({ status: 'cancelled', updated_at: stamp }).in('user_id', userIds).eq('service_date', date).in('status', ['planned', 'partial', 'active']);
}
