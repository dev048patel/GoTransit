/**
 * transitr-sms: the SMS commute alert service. Deployed on its own (Railway, root services/sms) so
 * a problem here can't take down the map, and a problem there doesn't stop alerts.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { config } from './config';
import { createApp } from './http/app';
import { startWorkers, stopWorkers } from './workers';
import { timetable } from './transit/timetable';
import { twilioConfigured } from './delivery/twilio';
import { reginaDate } from './time';

const c = config();
const tt = timetable();
console.log(`[SMS] Timetable ${tt.feed.start}–${tt.feed.end}${tt.covers(reginaDate()) ? '' : ' — DOES NOT COVER TODAY, rebuild it'}`);
if (!c.supabaseUrl || !c.supabaseKey) console.error('[SMS] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set; every job will fail until they are.');
if (!c.enabled) console.warn('[SMS] SMS_ENABLED=false: nothing will be sent.');
else if (!twilioConfigured()) console.warn('[SMS] Twilio is not configured: texts are recorded in sms.messages, not sent.');
else console.log('[SMS] Dry run and pilot numbers are set on the admin Security page ("Text alerts today").');
if (!c.publicUrl) console.warn('[SMS] SMS_PUBLIC_URL is not set: Twilio replies and delivery receipts will be refused.');

const server = createApp().listen(c.port, '0.0.0.0', () => console.log(`[SMS] Listening on ${c.port}`));
startWorkers();

const shutdown = () => {
    stopWorkers();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5_000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', reason => console.error('[SMS] Unhandled rejection:', reason));
