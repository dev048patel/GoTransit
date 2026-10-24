/**
 * Dry run and the pilot numbers, which admins set on the admin Security page ("Text alerts today").
 * They live in sms.settings (docs/security/sms_003_send_settings.sql), so a change takes effect
 * within READ_EVERY_MS, with no redeploy.
 *
 *   dryRun     texts are recorded in sms.messages but not sent
 *   allowlist  when not empty, only these numbers get real texts (the team pilot)
 *
 * Until an admin has saved anything (no table or no row), it is a dry run. If the row can't be read
 * for a moment, the last values read stay in use; with none yet, sending waits (deliver retries).
 */
import { sms } from './db';

export interface SendSettings { dryRun: boolean; allowlist: string[] }

const READ_EVERY_MS = 15_000;
const NOT_SET_UP: SendSettings = { dryRun: true, allowlist: [] };

let last: { at: number; value: SendSettings } | null = null;
let warnedMissing = false;

export async function sendSettings(now = Date.now()): Promise<SendSettings> {
    if (last && now - last.at < READ_EVERY_MS) return last.value;
    const { data, error } = await sms().from('settings').select('dry_run, allowlist').maybeSingle();
    let value: SendSettings;
    if (error && /PGRST205|42P01|does not exist|schema cache/i.test(`${error.code} ${error.message}`)) {
        if (!warnedMissing) console.warn('[SMS] sms.settings does not exist yet (run docs/security/sms_003_send_settings.sql): staying in dry run.');
        warnedMissing = true;
        value = NOT_SET_UP;
    } else if (error) {
        if (last) return last.value;
        throw new Error(`reading sms.settings: ${error.message}`);
    } else {
        const row = data as { dry_run: boolean; allowlist: string[] | null } | null;
        value = row ? { dryRun: row.dry_run !== false, allowlist: row.allowlist ?? [] } : NOT_SET_UP;
    }
    last = { at: now, value };
    return value;
}

/** Tests: read the row again on the next call */
export function _clearSendSettings(): void { last = null; }
