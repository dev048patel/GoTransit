/**
 * Every setting the service reads, in one place. Read on each call (not once at start-up) so tests
 * and a Railway variable change behave the same way.
 */
const flag = (v: string | undefined, fallback: boolean) => v === undefined || v === '' ? fallback : !/^(0|false|no|off)$/i.test(v);
const num = (v: string | undefined, fallback: number) => Number.isFinite(Number(v)) && v !== '' && v !== undefined ? Number(v) : fallback;
const list = (v: string | undefined) => (v ?? '').split(',').map(s => s.trim()).filter(Boolean);

export function config() {
    const e = process.env;
    return {
        port: num(e.PORT, 3002),
        supabaseUrl: e.SUPABASE_URL || e.VITE_SUPABASE_URL || '',
        supabaseKey: e.SUPABASE_SERVICE_ROLE_KEY || '',

        twilioSid: e.TWILIO_ACCOUNT_SID || '',
        twilioToken: e.TWILIO_AUTH_TOKEN || '',
        /** Preferred: a Messaging Service (sender pool, Twilio's own STOP handling). Else a single number. */
        twilioMessagingService: e.TWILIO_MESSAGING_SERVICE_SID || '',
        twilioFrom: e.TWILIO_PHONE_NUMBER || '',
        /** This service's public address, e.g. https://transitr-sms.up.railway.app. Twilio signs requests against it. */
        publicUrl: (e.SMS_PUBLIC_URL || '').replace(/\/+$/, ''),
        /** Shared secret the main API sends on /internal/* calls */
        serviceToken: e.SMS_SERVICE_TOKEN || '',

        liveBusesUrl: e.TRANSIT_LIVE_API_URL || '',
        predictionsUrl: e.TRANSIT_LIVE_PREDICTIONS_URL || 'https://transitlive.com/ajax/livemap.php',

        resendKey: e.RESEND_API_KEY || '',
        adminEmails: list(e.ALERT_EMAILS),
        emailFrom: e.ALERT_FROM || 'Transit Regina Alerts <alerts@transitregina.ca>',
        appUrl: (e.APP_URL || 'https://transitregina.ca').replace(/\/+$/, ''),

        /** false: send nothing at all (alerts go stale and are skipped). */
        enabled: flag(e.SMS_ENABLED, true),
        // Dry run and the pilot numbers are set on the admin panel: see settings.ts
        /** Ceiling on the daily quota, set from the monthly budget */
        dailyLimitMax: num(e.SMS_DAILY_LIMIT_MAX, 500),
        perUserDailyCap: num(e.SMS_PER_USER_DAILY_CAP, 6),
    };
}

export type Config = ReturnType<typeof config>;
