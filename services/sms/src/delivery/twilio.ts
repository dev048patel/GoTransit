/**
 * The only place that talks to Twilio. Kept tiny so tests can swap it (setTwilioClient).
 */
import twilio from 'twilio';
import { config } from '../config';

export interface SentSms { sid: string; status: string }
export interface TwilioLike {
    send(to: string, body: string, statusCallback?: string): Promise<SentSms>;
    price(sid: string): Promise<{ price: number | null; unit: string | null }>;
}

/** A Twilio error, reduced to what the sender decides on */
export class SendError extends Error {
    constructor(message: string, readonly code: number | null, readonly httpStatus: number | null) { super(message); }
    /** Network trouble, rate limiting or a Twilio outage: worth another try while the alert is fresh */
    get retryable(): boolean { return this.httpStatus === null || this.httpStatus === 429 || this.httpStatus >= 500; }
}

/** Twilio error 21610: the recipient replied STOP to this sender, so Twilio blocks texts to them */
export const ERROR_OPTED_OUT = 21610;

let override: TwilioLike | null = null;
let real: { key: string; client: TwilioLike } | null = null;

export function twilioConfigured(): boolean {
    const c = config();
    return !!(c.twilioSid && c.twilioToken && (c.twilioMessagingService || c.twilioFrom));
}

export function twilioClient(): TwilioLike | null {
    if (override) return override;
    if (!twilioConfigured()) return null;
    const c = config();
    const key = [c.twilioSid, c.twilioToken, c.twilioMessagingService, c.twilioFrom].join('|');
    if (real?.key === key) return real.client;
    const api = twilio(c.twilioSid, c.twilioToken);
    const client: TwilioLike = {
        async send(to, body, statusCallback) {
            try {
                const m = await api.messages.create({
                    to, body, ...(statusCallback ? { statusCallback } : {}),
                    ...(c.twilioMessagingService ? { messagingServiceSid: c.twilioMessagingService } : { from: c.twilioFrom }),
                });
                return { sid: m.sid, status: m.status };
            } catch (err: any) {
                throw new SendError(String(err?.message ?? err), typeof err?.code === 'number' ? err.code : null, typeof err?.status === 'number' ? err.status : null);
            }
        },
        async price(sid) {
            const m = await api.messages(sid).fetch();
            return { price: m.price == null ? null : Number(m.price), unit: m.priceUnit ?? null };
        },
    };
    real = { key, client };
    return client;
}

/** Test hook: null puts the real client back */
export function setTwilioClient(client: TwilioLike | null) { override = client; }
