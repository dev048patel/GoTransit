/**
 * Stand-ins for what the service talks to, so the real jobs and routes run end to end in tests:
 *
 *   a PostgREST server   records every request; each test says what to answer (`respond`)
 *   TransitLive          predictions and live buses from test data, on the same server
 *   Twilio and email     recorded in memory
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { setTwilioClient, SendError, TwilioLike } from '../src/delivery/twilio';
import { setMailer, Email } from '../src/delivery/email';
import { _clearTransitLiveCache } from '../src/transit/transitLive';

export interface Call { method: string; table: string; query: URLSearchParams; schema: string; body: any; order: number }
type Answer = unknown | [status: number, body: unknown];

let order = 0;
export const calls: Call[] = [];
export const texts: { to: string; body: string; order: number }[] = [];
export const emails: Email[] = [];
/** set per test: what the database answers. Return undefined for the default (rows: [], writes: echo). */
export let respond: (c: Call) => Answer | undefined = () => undefined;
export const setRespond = (fn: typeof respond) => { respond = fn; };
/** TransitLive test data */
export const live = { predictions: new Map<string, unknown[]>(), buses: [] as unknown[] };
/** Twilio's behaviour for the next sends: undefined = accept */
export let twilioFails: SendError | null = null;
export const setTwilioFails = (e: SendError | null) => { twilioFails = e; };

const fakeTwilio: TwilioLike = {
    async send(to, body) {
        if (twilioFails) throw twilioFails;
        texts.push({ to, body, order: ++order });
        return { sid: `SM${texts.length}`, status: 'queued' };
    },
    async price() { return { price: -0.0083, unit: 'USD' }; },
};

const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', () => {
        const url = new URL(req.url ?? '/', 'http://x');
        const send = (status: number, body: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
        if (url.pathname === '/livemap') { send(200, live.predictions.get(url.searchParams.get('stop') ?? '') ?? []); return; }
        if (url.pathname === '/buses') { send(200, live.buses); return; }

        const table = url.pathname.replace(/^\/rest\/v1\//, '');
        const call: Call = {
            method: req.method ?? 'GET', table, query: url.searchParams,
            schema: String(req.headers['content-profile'] ?? req.headers['accept-profile'] ?? 'public'),
            body: raw ? JSON.parse(raw) : undefined, order: ++order,
        };
        calls.push(call);
        let answer = respond(call);
        let status = 200;
        if (Array.isArray(answer) && answer.length === 2 && typeof answer[0] === 'number') [status, answer] = answer as [number, unknown];
        if (answer === undefined) answer = call.method === 'GET' ? [] : table.startsWith('rpc/') ? null : (Array.isArray(call.body) ? call.body : [call.body ?? {}]);
        // .single() asks for one object; PostgREST answers 406 when there is none
        if (String(req.headers.accept).includes('vnd.pgrst.object') && Array.isArray(answer)) {
            if (!answer.length) { send(406, { message: 'no rows', code: 'PGRST116' }); return; }
            answer = answer[0];
        }
        send(status, answer);
    });
});

export async function startFakes(): Promise<string> {
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    Object.assign(process.env, {
        SUPABASE_URL: base, SUPABASE_SERVICE_ROLE_KEY: 'service-key',
        TRANSIT_LIVE_API_URL: `${base}/buses`, TRANSIT_LIVE_PREDICTIONS_URL: `${base}/livemap`,
        TWILIO_ACCOUNT_SID: 'ACtest', TWILIO_AUTH_TOKEN: 'twilio-test-token', TWILIO_PHONE_NUMBER: '+13065550100',
        SMS_PUBLIC_URL: 'https://sms.example.test', SMS_SERVICE_TOKEN: 'internal-test-token',
        RESEND_API_KEY: 'resend-test', ALERT_EMAILS: 'admin@example.test',
        SMS_DRY_RUN: 'false', SMS_ENABLED: 'true', SMS_ALLOWLIST: '',
    });
    setTwilioClient(fakeTwilio);
    setMailer(async e => { emails.push(e); return true; });
    return base;
}

export function stopFakes() { server.close(); setTwilioClient(null); setMailer(null); }

export function resetFakes() {
    calls.length = 0; texts.length = 0; emails.length = 0; order = 0;
    respond = () => undefined; twilioFails = null;
    live.predictions.clear(); live.buses = [];
    _clearTransitLiveCache();
    process.env.SMS_DRY_RUN = 'false'; process.env.SMS_ALLOWLIST = ''; process.env.SMS_ENABLED = 'true';
}

/** The calls to one table (and method), in order */
export const callsTo = (table: string, method?: string) => calls.filter(c => c.table === table && (!method || c.method === method));
/** A PostgREST filter value, e.g. eq('status') → "pending" for status=eq.pending */
export const filter = (c: Call, column: string) => c.query.get(column)?.replace(/^[a-z]+\./, '');
