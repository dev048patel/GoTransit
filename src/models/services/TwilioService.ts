import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
const authToken  = process.env.TWILIO_AUTH_TOKEN  ?? '';
const fromPhone  = process.env.TWILIO_PHONE_NUMBER ?? '';

const configured = !!(accountSid && authToken && fromPhone);
const client = configured ? twilio(accountSid, authToken) : null;

export interface SmsRecipient {
    phone: string;
    body: string;
}

export const TwilioService = {
    isConfigured(): boolean {
        return configured;
    },

    async sendSms(to: string, body: string): Promise<void> {
        if (!client) {
            console.warn('[Twilio] Not configured — skipping SMS to', to);
            return;
        }
        try {
            await client.messages.create({ to, from: fromPhone, body });
        } catch (err) {
            console.error('[Twilio] Send failed to', to, err);
        }
    },

    // Sends to a list of recipients with a 100ms gap between each call to
    // stay well within Twilio's 10 msg/s Canadian long-code rate limit.
    async sendBatch(recipients: SmsRecipient[]): Promise<void> {
        for (const r of recipients) {
            await TwilioService.sendSms(r.phone, r.body);
            await delay(100);
        }
    },
};

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
