/**
 * PhoneVerificationService — proves a rider owns their phone number before any text alert goes to it.
 *
 * Twilio Verify sends the code and checks it: it makes the code, expires it after 10 minutes, allows
 * 5 guesses per code and limits how many codes one number is sent. Needs TWILIO_ACCOUNT_SID,
 * TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID (a Verify Service, "VA…").
 *
 * Only the backend sets profiles.mobile_verified to true, after a correct code. The database refuses
 * it from a browser and turns it back to false whenever the number changes
 * (docs/security/sms_002_phone_verification.sql).
 */
import twilio from 'twilio';

export type CheckResult = 'approved' | 'wrong' | 'expired';

export interface VerifyClient {
    send(to: string): Promise<void>;
    check(to: string, code: string): Promise<CheckResult>;
}

/** A failure the rider can act on, with the HTTP status to answer */
export class VerifyError extends Error {
    constructor(message: string, readonly status: number) { super(message); }
}

/** Twilio Verify error codes → what to tell the rider */
function explain(err: unknown): VerifyError {
    const code = (err as { code?: number }).code;
    if (code === 60203) return new VerifyError('Too many codes sent to this number. Wait 10 minutes and try again.', 429);
    if (code === 60202) return new VerifyError('Too many wrong codes. Send a new code.', 429);
    if (code === 60205) return new VerifyError('This looks like a landline. Enter a mobile number that can receive texts.', 400);
    if (code === 60200 || code === 21211 || code === 21614) return new VerifyError('A code could not be texted to this number. Check that it is a Canadian mobile number.', 400);
    if (code === 60410 || code === 60605) return new VerifyError('Texts to this number are blocked. Contact us if you think this is a mistake.', 400);
    console.error('[Verify] Twilio error:', code ?? '', (err as Error).message);
    return new VerifyError('The code could not be sent. Try again in a few minutes.', 503);
}

function twilioVerify(): VerifyClient | null {
    const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN, service = process.env.TWILIO_VERIFY_SERVICE_SID;
    if (!sid || !token || !service) return null;
    const verify = twilio(sid, token).verify.v2.services(service);
    return {
        async send(to) {
            try { await verify.verifications.create({ to, channel: 'sms', locale: 'en' }); }
            catch (err) { throw explain(err); }
        },
        async check(to, code) {
            try { return (await verify.verificationChecks.create({ to, code })).status === 'approved' ? 'approved' : 'wrong'; }
            catch (err) {
                // 404: no code is waiting for this number (expired, out of guesses, or already used)
                if ((err as { status?: number }).status === 404) return 'expired';
                throw explain(err);
            }
        },
    };
}

let client: VerifyClient | null | undefined;
const verifyClient = () => (client === undefined ? (client = twilioVerify()) : client);

export const PhoneVerificationService = {
    configured: () => !!verifyClient(),
    send: (to: string) => verifyClient()!.send(to),
    check: (to: string, code: string) => verifyClient()!.check(to, code),
    /** Tests: replace Twilio (null goes back to reading the settings) */
    _setClient(c: VerifyClient | null) { client = c ?? undefined; },
};
