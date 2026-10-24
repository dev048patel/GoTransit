/**
 * Every text goes through deliver(): the message row is written before Twilio is called and updated
 * after, so sms.messages always shows what was attempted, even if the service dies mid-send.
 *
 * A dry run (dry run on in the admin panel, a number not on its pilot list, or Twilio not configured)
 * writes the row and stops there.
 */
import { config } from '../config';
import { sms } from '../db';
import { sendSettings, SendSettings } from '../settings';
import { segments, toGsm } from '../alerts/gsm';
import { SendError, twilioClient } from './twilio';

export type MessageKind = 'alert' | 'broadcast' | 'reply';

export interface Outgoing { to: string; body: string; userId: string | null; alertId: string | null; kind: MessageKind }
export type Delivery =
    | { ok: true; dryRun: boolean; messageId: string; sid: string | null }
    | { ok: false; retryable: boolean; code: number | null; messageId: string | null; error: string };

export function isDryRun(to: string, s: SendSettings): boolean {
    return s.dryRun || (s.allowlist.length > 0 && !s.allowlist.includes(to)) || !twilioClient();
}

export async function deliver(msg: Outgoing): Promise<Delivery> {
    const body = toGsm(msg.body);
    // Not knowing whether this is a dry run, nothing is recorded or sent: the caller retries
    const settings = await sendSettings().catch((err: Error) => err);
    if (settings instanceof Error) return { ok: false, retryable: true, code: null, messageId: null, error: settings.message };
    const dryRun = isDryRun(msg.to, settings);
    const { data: row, error } = await sms().from('messages').insert({
        alert_id: msg.alertId, user_id: msg.userId, kind: msg.kind, to_phone: msg.to, body,
        segments: segments(body), status: dryRun ? 'dry_run' : 'sending', dry_run: dryRun,
    }).select('id').single();
    // Without a row nothing is sent: a text the log can't show is a text nobody can account for
    if (error || !row) return { ok: false, retryable: true, code: null, messageId: null, error: `could not record the message: ${error?.message}` };
    if (dryRun) {
        console.log(`[SMS] Dry run (${msg.kind}) to ${maskPhone(msg.to)}: ${body}`);
        return { ok: true, dryRun: true, messageId: row.id, sid: null };
    }

    const { publicUrl } = config();
    try {
        const sent = await twilioClient()!.send(msg.to, body, publicUrl ? `${publicUrl}/twilio/status` : undefined);
        await sms().from('messages').update({ twilio_sid: sent.sid, status: sent.status || 'queued', updated_at: new Date().toISOString() }).eq('id', row.id);
        return { ok: true, dryRun: false, messageId: row.id, sid: sent.sid };
    } catch (err) {
        const e = err instanceof SendError ? err : new SendError(String((err as Error)?.message ?? err), null, null);
        await sms().from('messages').update({ status: 'failed', error_code: e.code, updated_at: new Date().toISOString() }).eq('id', row.id);
        return { ok: false, retryable: e.retryable, code: e.code, messageId: row.id, error: e.message };
    }
}

/** +1306***0199: enough to tell numbers apart in a log, not enough to text someone */
export const maskPhone = (p: string) => p.length > 7 ? `${p.slice(0, 5)}***${p.slice(-4)}` : '***';
