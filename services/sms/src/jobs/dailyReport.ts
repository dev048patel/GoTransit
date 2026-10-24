/**
 * The nightly admin report for the previous service day: a summary email with the workbook attached.
 * Runs hourly from 01:00 to 06:00 Regina time; sms.daily_reports makes sure each day is emailed once
 * (the row is written first, and removed again if the email can't be sent, so the next hour retries).
 */
import { app, inChunks, must, sms } from '../db';
import { config } from '../config';
import { timetable } from '../transit/timetable';
import { emailAdmins } from '../delivery/email';
import { twilioClient } from '../delivery/twilio';
import { addDays, instantOf, parseHhmm, reginaDate, reginaMinutes } from '../time';
import { buildWorkbook, Cell, HourRow, Sheet } from '../report/xlsx';

interface MessageRow { id: string; alert_id: string | null; user_id: string | null; kind: string; status: string; segments: number; price: number | null; price_unit: string | null; twilio_sid: string | null; dry_run: boolean; error_code: number | null; created_at: string }

const PRICE_LOOKUPS = 500;

export async function runDailyReport(now = Date.now()): Promise<'sent' | 'already' | 'nothing' | 'no_email'> {
    const date = addDays(reginaDate(now), -1);
    const cfg = config();
    if (!cfg.resendKey || !cfg.adminEmails.length) return 'no_email';

    const { error: claimErr } = await sms().from('daily_reports').insert({ service_date: date, status: 'sending', recipients: cfg.adminEmails });
    if (claimErr) {
        if (/duplicate|unique/i.test(claimErr.message)) return 'already';
        throw new Error(`claiming the report: ${claimErr.message}`);
    }
    try {
        const report = await buildReport(date);
        if (!report) { await sms().from('daily_reports').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('service_date', date); return 'nothing'; }
        const sent = await emailAdmins(`Daily SMS report for ${date}`, report.text, [{ filename: `transitr-sms-${date}.xlsx`, content: report.workbook }]);
        if (!sent) throw new Error('the email was not sent');
        await sms().from('daily_reports').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('service_date', date);
        return 'sent';
    } catch (err) {
        await sms().from('daily_reports').delete().eq('service_date', date).eq('status', 'sending');
        throw err;
    }
}

/** Twilio reports a message's price some minutes after delivery; fetch the ones still missing */
async function fillPrices(messages: MessageRow[]): Promise<void> {
    const client = twilioClient();
    if (!client) return;
    const missing = messages.filter(m => m.twilio_sid && m.price === null).slice(0, PRICE_LOOKUPS);
    for (let i = 0; i < missing.length; i += 5) {
        await Promise.all(missing.slice(i, i + 5).map(async m => {
            try {
                const p = await client.price(m.twilio_sid!);
                if (p.price === null) return;
                m.price = p.price; m.price_unit = p.unit;
                await sms().from('messages').update({ price: p.price, price_unit: p.unit }).eq('id', m.id);
            } catch { /* left blank in the report */ }
        }));
    }
}

export async function buildReport(date: string): Promise<{ text: string; workbook: Buffer } | null> {
    const tt = timetable();
    const from = instantOf(date, 0).toISOString(), to = instantOf(date, 1440).toISOString();

    const plans = must(await sms().from('trip_plans').select('id, user_id, arrive_by, status').eq('service_date', date), 'reading plans') as
        { id: string; user_id: string; arrive_by: string; status: string }[];
    const messages = must(await sms().from('messages').select('id, alert_id, user_id, kind, status, segments, price, price_unit, twilio_sid, dry_run, error_code, created_at')
        .gte('created_at', from).lt('created_at', to).order('created_at'), 'reading messages') as MessageRow[];
    if (!plans.length && !messages.length) return null;
    await fillPrices(messages);

    const alerts = must(await sms().from('alerts').select('id, plan_id, leg_id, kind, status').eq('service_date', date), 'reading alerts') as
        { id: string; plan_id: string; leg_id: string | null; kind: string; status: string }[];
    const legs = plans.length ? await inChunks(plans.map(p => p.id), async ids => must(await sms().from('trip_legs')
        .select('id, plan_id, seq, route_num, board_stop_id, alight_stop_id, bus_id').in('plan_id', ids).order('seq'), 'reading legs') as
        { id: string; plan_id: string; seq: number; route_num: string; board_stop_id: string; alight_stop_id: string; bus_id: string | null }[]) : [];
    const userIds = [...new Set([...plans.map(p => p.user_id), ...messages.map(m => m.user_id).filter((x): x is string => !!x)])];
    const emails = new Map((await inChunks(userIds, async ids => must(await app().from('profiles').select('id, email').in('id', ids), 'reading emails') as
        { id: string; email: string | null }[])).map(p => [p.id, p.email ?? '']));
    const { data: outage } = await sms().from('outage_days').select('*').eq('service_date', date).maybeSingle();
    const { data: quota } = await sms().from('daily_quotas').select('*').eq('service_date', date).maybeSingle();

    const planById = new Map(plans.map(p => [p.id, p]));
    const legById = new Map(legs.map(l => [l.id, l]));
    const firstLeg = new Map<string, typeof legs[number]>();
    for (const l of legs) if (!firstLeg.has(l.plan_id)) firstLeg.set(l.plan_id, l);
    const alertById = new Map(alerts.map(a => [a.id, a]));
    const stop = (id?: string) => { if (!id) return ''; const i = tt.stopIndex(id); return i === undefined ? id : `${id} ${tt.names[i]}`; };

    // ── Tab 1: one row per alert text ──
    const header = ['Service date', 'Route', 'Bus (vehicle)', 'Boarding stop', 'Alighting stop', 'User email', 'Requested arrive-by', 'Plan status',
        'Alert type', 'Delivery status', 'Dry run', 'Segments', 'Cost', 'Cost unit', 'Sent at'];
    const rows: Cell[][] = [];
    let segTotal = 0, costTotal = 0;
    const units = new Set<string>();
    for (const m of messages.filter(x => x.kind === 'alert')) {
        const a = m.alert_id ? alertById.get(m.alert_id) : undefined;
        const plan = a ? planById.get(a.plan_id) : undefined;
        const leg = (a?.leg_id && legById.get(a.leg_id)) || (plan && firstLeg.get(plan.id));
        segTotal += m.segments;
        if (m.price !== null) { costTotal += Math.abs(Number(m.price)); if (m.price_unit) units.add(m.price_unit); }
        rows.push([date, leg?.route_num ?? '', leg?.bus_id ?? '', stop(leg?.board_stop_id), stop(leg?.alight_stop_id), (m.user_id && emails.get(m.user_id)) || '',
            plan?.arrive_by ?? '', plan?.status ?? '', a?.kind ?? '', m.status, m.dry_run ? 'yes' : '', m.segments,
            m.price === null ? null : Math.abs(Number(m.price)), m.price_unit ?? '', clockOf(m.created_at)]);
    }
    rows.push(['Total', '', '', '', '', '', '', '', `${rows.length} texts`, '', '', segTotal, Number(costTotal.toFixed(4)), [...units].join(' '), '']);
    const sheet: Sheet = { name: 'Requests', header, rows, boldLastRow: true, widths: [12, 7, 12, 34, 34, 28, 12, 11, 10, 13, 8, 9, 9, 9, 8] };

    // ── Tab 2: users by requested arrival hour, texts by send hour ──
    const usersByHour = Array.from({ length: 24 }, () => new Set<string>());
    for (const p of plans) { const m = parseHhmm(p.arrive_by); if (m !== null) usersByHour[Math.floor(m / 60)].add(p.user_id); }
    const smsByHour = new Array(24).fill(0);
    for (const m of messages) smsByHour[Math.floor(reginaMinutes(Date.parse(m.created_at)) / 60) % 24]++;
    const hours: HourRow[] = usersByHour.map((u, h) => ({ hour: h, users: u.size, sms: smsByHour[h] }));

    // ── The email ──
    const count = (pred: (m: MessageRow) => boolean) => messages.filter(pred).length;
    const statusCount = (s: string) => plans.filter(p => p.status === s).length;
    const real = messages.filter(m => !m.dry_run);
    const failed = real.filter(m => ['failed', 'undelivered'].includes(m.status));
    const busiest = hours.filter(h => h.users).sort((a, b) => b.users - a.users).slice(0, 3);
    const errors = new Map<number, number>();
    for (const m of failed) if (m.error_code) errors.set(m.error_code, (errors.get(m.error_code) ?? 0) + 1);

    const lines = [
        `SMS alerts for ${date}`,
        '',
        ...(outage ? [`OUTAGE DAY: ${outage.cause}. ${outage.emails_sent} riders were emailed.`, ''] : []),
        `Riders served: ${new Set(plans.map(p => p.user_id)).size}`,
        `Plans: ${plans.length} (${statusCount('completed')} completed, ${statusCount('active')} still active, ${statusCount('planned')} not started, ` +
            `${statusCount('partial')} partial, ${statusCount('no_service')} no service, ${statusCount('cancelled')} cancelled by a STOP)`,
        `Texts: ${real.length} sent (${count(m => !m.dry_run && m.status === 'delivered')} delivered, ${failed.length} failed)` +
            `${messages.length > real.length ? `, plus ${messages.length - real.length} dry runs` : ''}`,
        `  by kind: ${count(m => m.kind === 'alert')} alerts, ${count(m => m.kind === 'reply')} replies, ${count(m => m.kind === 'broadcast')} broadcasts`,
        `Segments: ${messages.reduce((n, m) => n + m.segments, 0)}`,
        `Cost: ${costTotal.toFixed(4)} ${[...units].join(' ') || '(no prices reported yet)'}`,
        ...(quota ? [`Quota: ${quota.sent_count} of ${quota.quota} used`] : []),
        `Busiest hours (requested arrival): ${busiest.map(h => `${String(h.hour).padStart(2, '0')}:00 (${h.users})`).join(', ') || 'none'}`,
        ...(errors.size ? ['', 'Failures to look at:', ...[...errors].map(([code, n]) => `  Twilio error ${code}: ${n} (https://www.twilio.com/docs/api/errors/${code})`)] : []),
        '',
        'The attached workbook has one row per alert (tab 1) and riders by requested arrival hour with a chart (tab 2).',
    ];
    return { text: lines.join('\n'), workbook: await buildWorkbook(sheet, hours) };
}

const clockOf = (iso: string) => { const m = Math.floor(reginaMinutes(Date.parse(iso))); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
