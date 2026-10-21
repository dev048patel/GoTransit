/**
 * Email through Resend's HTTP API, the same provider the main API uses for admin alerts.
 * Without RESEND_API_KEY nothing is sent (and the caller is told, so it can say so in the log).
 */
import { config } from '../config';

export interface Attachment { filename: string; content: Buffer }
export interface Email { to: string[]; subject: string; text: string; attachments?: Attachment[] }
type Mailer = (email: Email) => Promise<boolean>;

const resend: Mailer = async ({ to, subject, text, attachments }) => {
    const { resendKey, emailFrom } = config();
    if (!resendKey || !to.length) return false;
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: emailFrom, to, subject, text,
            ...(attachments?.length ? { attachments: attachments.map(a => ({ filename: a.filename, content: a.content.toString('base64') })) } : {}),
        }),
        signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Resend answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return true;
};

let mailer: Mailer = resend;

/** true when the email was handed to Resend */
export const sendEmail = (email: Email) => mailer(email);

/** Admins (ALERT_EMAILS). Never throws: a failed admin email must not stop the job that sent it. */
export async function emailAdmins(subject: string, text: string, attachments?: Attachment[]): Promise<boolean> {
    try { return await mailer({ to: config().adminEmails, subject: `[Transit Regina SMS] ${subject}`, text, attachments }); }
    catch (err) { console.error('[Email] Admin email failed:', (err as Error).message); return false; }
}

/** Test hook: null puts Resend back */
export function setMailer(fn: Mailer | null) { mailer = fn ?? resend; }
