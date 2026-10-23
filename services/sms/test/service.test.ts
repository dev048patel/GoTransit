/**
 * The real jobs and HTTP routes, run against stand-ins for Supabase, TransitLive, Twilio and email
 * (test/fakes.ts). Run: npm test
 */
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import twilio from 'twilio';
import JSZip from 'jszip';
import { startFakes, stopFakes, resetFakes, setRespond, calls, callsTo, filter, texts, emails, live, setTwilioFails } from './fakes';
import { createApp } from '../src/http/app';
import { runSender } from '../src/jobs/sender';
import { runPlanner } from '../src/jobs/dailyPlanner';
import { runTracker } from '../src/jobs/tripTracker';
import { runDailyReport } from '../src/jobs/dailyReport';
import { SendError } from '../src/delivery/twilio';
import { timetable } from '../src/transit/timetable';
import { planArriveBy } from '../src/transit/planner';
import { buildPlan } from '../src/alerts/buildAlerts';
import { HELP_TEXT } from '../src/alerts/messages';
import { clockAt, instantOf } from '../src/time';
import { AlertDb, LegDb, PlanDb } from '../src/types';

let server: Server, base = '';
before(async () => {
    await startFakes();
    server = createApp().listen(0, '127.0.0.1');
    await new Promise<void>(r => server.once('listening', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => { server.close(); stopFakes(); });
beforeEach(() => resetFakes());

const PHONE = '+13065550199';
const settle = (ms = 50) => new Promise(r => setTimeout(r, ms));

async function twilioPost(path: string, params: Record<string, string>, signed = true) {
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (signed) headers['X-Twilio-Signature'] = twilio.getExpectedTwilioSignature('twilio-test-token', `https://sms.example.test${path}`, params);
    return fetch(base + path, { method: 'POST', headers, body: new URLSearchParams(params).toString() });
}

/* A real commute on the real timetable: downtown to the University of Regina by 9:00 on a Wednesday */
const DATE = '2026-10-21';
function realPlan() {
    const tt = timetable();
    const dest = { lat: 50.4154, lng: -104.5880 };
    const rows = buildPlan(tt, DATE, { scheduleId: 's1', userId: 'u1', arriveBy: '09:00', departBy: null, originName: 'Home', destinationName: 'U of R' },
        planArriveBy(tt, DATE, { lat: 50.4479, lng: -104.6107 }, dest, 540), 270);
    const plan: PlanDb = { id: 'p1', ...rows.plan, status: 'planned', notice: rows.plan.notice as PlanDb['notice'] };
    const legs: LegDb[] = rows.legs.map(l => ({ ...l, id: `l${l.seq}`, plan_id: 'p1', bus_id: null, live_board_at: null, live_alight_at: null, matched_at: null }));
    const alerts: AlertDb[] = rows.alerts.map((a, i) => ({ id: `a${i + 1}`, plan_id: 'p1', leg_id: a.leg_seq ? `l${a.leg_seq}` : null, user_id: 'u1', service_date: DATE, kind: a.kind, due_at: a.due_at, status: 'pending', attempts: 0 }));
    return { plan, legs, alerts };
}

/* ── HTTP ── */

test('health answers without giving anything away', async () => {
    const r = await fetch(`${base}/health`);
    assert.equal(r.status, 200);
    const text = await r.text();
    assert.equal(JSON.parse(text).ok, true);
    for (const secret of ['twilio-test-token', 'service-key', 'internal-test-token', 'resend-test']) assert.ok(!text.includes(secret));
});

test('Twilio routes refuse requests without a valid Twilio signature', async () => {
    assert.equal((await twilioPost('/twilio/inbound', { From: PHONE, Body: 'STOP' }, false)).status, 403);
    assert.equal((await twilioPost('/twilio/status', { MessageSid: 'SM1', MessageStatus: 'delivered' }, false)).status, 403);
    const forged = await fetch(`${base}/twilio/inbound`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': 'made-up' }, body: `From=${encodeURIComponent(PHONE)}&Body=START` });
    assert.equal(forged.status, 403);
    assert.equal(calls.length, 0, 'nothing reached the database');
});

test('STOP opts the rider out and cancels the rest of their day', async () => {
    setRespond(c => c.table === 'profiles' && c.method === 'GET' ? [{ id: 'u1', sms_opted_in: true }] : undefined);
    const r = await twilioPost('/twilio/inbound', { From: PHONE, Body: ' stop ' });
    assert.equal(r.status, 200);
    assert.equal(await r.text(), '<Response></Response>', 'Twilio sends its own STOP confirmation');
    const optOut = callsTo('profiles', 'PATCH')[0];
    assert.equal(optOut.body.sms_opted_in, false);
    const skip = callsTo('alerts', 'PATCH')[0];
    assert.equal(skip.schema, 'sms');
    assert.equal(skip.body.status, 'skipped');
    assert.equal(filter(skip, 'status'), 'pending');
});

test('HELP answers in the same text thread and is counted as a sent message', async () => {
    setRespond(c => c.table === 'profiles' && c.method === 'GET' ? [{ id: 'u1', sms_opted_in: true }] : undefined);
    const r = await twilioPost('/twilio/inbound', { From: PHONE, Body: 'Help' });
    assert.match(await r.text(), /<Message>TransitR commute alerts:/);
    const logged = callsTo('messages', 'POST')[0];
    assert.equal(logged.body.kind, 'reply');
    assert.equal(logged.body.body, HELP_TEXT);
});

test('any other word, SKIP and MISSED included, gets no reply and changes nothing', async () => {
    setRespond(c => c.table === 'profiles' && c.method === 'GET' ? [{ id: 'u1', sms_opted_in: true }] : undefined);
    for (const word of ['SKIP', 'MISSED', 'thanks']) {
        const r = await twilioPost('/twilio/inbound', { From: PHONE, Body: word });
        assert.equal(await r.text(), '<Response></Response>', word);
    }
    assert.equal(callsTo('messages').length, 0);
    assert.equal(calls.filter(c => c.method !== 'GET').length, 0, 'no plan, alert or profile was changed');
});

test('delivery receipts update the message', async () => {
    assert.equal((await twilioPost('/twilio/status', { MessageSid: 'SM42', MessageStatus: 'undelivered', ErrorCode: '30003' })).status, 204);
    const u = callsTo('messages', 'PATCH')[0];
    assert.equal(filter(u, 'twilio_sid'), 'SM42');
    assert.equal(u.body.status, 'undelivered');
    assert.equal(u.body.error_code, 30003);
});

test('broadcast needs the internal token, then texts each opted-in rider on the route once', async () => {
    const post = (token?: string) => fetch(`${base}/internal/broadcast`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ routeNum: '4', message: 'Route 4 detour on Albert St – expect delays' }) });
    assert.equal((await post()).status, 401);
    assert.equal((await post('wrong-token-of-same-size')).status, 401);
    setRespond(c => {
        if (c.table === 'weekly_schedules') return [{ user_id: 'u1' }, { user_id: 'u1' }, { user_id: 'u2' }];
        if (c.table === 'profiles') return [{ id: 'u1', mobile_number: PHONE }, { id: 'u2', mobile_number: '+13065550222' }];
        if (c.table === 'messages' && c.method === 'POST') return [{ id: 'm1' }];
        return undefined;
    });
    const r = await post('internal-test-token');
    assert.deepEqual(await r.json(), { ok: true, sent: 2 });
    await settle(400);
    assert.equal(texts.length, 2);
    assert.equal(texts[0].body, 'Route 4 detour on Albert St - expect delays', 'the dash is swapped so the text stays one segment');
});

test('broadcast leaves out riders an admin has switched text alerts off for', async () => {
    setRespond(c => {
        if (c.table === 'weekly_schedules') return [{ user_id: 'u1' }, { user_id: 'u2' }];
        if (c.table === 'profiles') return [{ id: 'u1', mobile_number: PHONE }, { id: 'u2', mobile_number: '+13065550222' }];
        if (c.table === 'feature_access') return [{ user_id: 'u2' }];
        if (c.table === 'messages' && c.method === 'POST') return [{ id: 'm1' }];
        return undefined;
    });
    const r = await fetch(`${base}/internal/broadcast`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer internal-test-token' }, body: JSON.stringify({ routeNum: '4', message: 'Detour' }) });
    assert.deepEqual(await r.json(), { ok: true, sent: 1 });
    await settle(300);
    assert.deepEqual(texts.map(t => t.to), [PHONE]);
    assert.equal(filter(callsTo('feature_access')[0], 'feature'), 'sms_alerts');
});

/* ── Sender ── */

function senderDb(opts: { alert: AlertDb; plan: PlanDb; legs: LegDb[]; claim?: string; profile?: object; revoked?: boolean }) {
    setRespond(c => {
        if (c.table === 'feature_access') return opts.revoked ? [{ user_id: opts.alert.user_id }] : [];
        if (c.table === 'alerts' && c.method === 'GET') return [opts.alert];
        if (c.table === 'rpc/claim_alert') return opts.claim ?? 'queued';
        if (c.table === 'profiles' && c.method === 'GET') return [opts.profile ?? { mobile_number: PHONE, sms_opted_in: true, mobile_verified: true }];
        if (c.table === 'trip_plans' && c.method === 'GET') return [opts.plan];
        if (c.table === 'trip_legs' && c.method === 'GET') return opts.legs;
        if (c.table === 'messages' && c.method === 'POST') return [{ id: 'm1' }];
        if (c.table === 'daily_quotas' && c.method === 'GET') return [{ service_date: DATE, quota: 10, sent_count: 10, warned_80: true, warned_100: false, active_subscribers: 2, planned_alerts: 6 }];
        if (c.table === 'daily_quotas' && c.method === 'PATCH') return [{ service_date: DATE }];
        return undefined;
    });
}

test('sender: records the message, then texts it, then marks the alert sent and the trip started', async () => {
    const { plan, legs, alerts } = realPlan();
    senderDb({ alert: alerts[0], plan, legs });
    const r = await runSender(Date.parse(alerts[0].due_at) + 5_000);
    assert.equal(r.sent, 1);
    assert.equal(texts.length, 1);
    assert.match(texts[0].body, /^TransitR: Leave now\. Walk \d+ min to .+\. Route \d+ is due .+ \(timetable\)\. Reply STOP to opt out\.$/);
    assert.equal(texts[0].to, PHONE);
    const row = callsTo('messages', 'POST')[0];
    assert.ok(row.order < texts[0].order, 'the message row is written before Twilio is called');
    assert.equal(row.body.status, 'sending');
    assert.equal(row.body.segments, 1);
    assert.equal(callsTo('messages', 'PATCH')[0].body.twilio_sid, 'SM1');
    assert.equal(callsTo('alerts', 'PATCH').at(-1)!.body.status, 'sent');
    assert.equal(callsTo('trip_plans', 'PATCH')[0].body.status, 'active');
    assert.equal(callsTo('rpc/claim_alert')[0].body.p_per_user_cap, 6);
});

test('sender: dry run and the pilot allowlist record the text without sending it', async () => {
    const { plan, legs, alerts } = realPlan();
    for (const env of [{ SMS_DRY_RUN: 'true' }, { SMS_DRY_RUN: 'false', SMS_ALLOWLIST: '+13065550111' }]) {
        resetFakes();
        Object.assign(process.env, env);
        senderDb({ alert: alerts[0], plan, legs });
        await runSender(Date.parse(alerts[0].due_at));
        assert.equal(texts.length, 0, JSON.stringify(env));
        assert.equal(callsTo('messages', 'POST')[0].body.status, 'dry_run');
        assert.equal(callsTo('alerts', 'PATCH').at(-1)!.body.status, 'sent');
    }
});

test('sender: a stale "next stop" alert is skipped, not sent late', async () => {
    const { plan, legs, alerts } = realPlan();
    senderDb({ alert: alerts[1], plan, legs });
    const r = await runSender(Date.parse(alerts[1].due_at) + 2 * 60_000);
    assert.equal(r.skipped, 1);
    assert.equal(callsTo('rpc/claim_alert').length, 0);
    assert.equal(callsTo('alerts', 'PATCH')[0].body.status, 'skipped');
    assert.equal(texts.length, 0);
});

test('sender: over quota nothing is sent and admins are told once', async () => {
    const { plan, legs, alerts } = realPlan();
    senderDb({ alert: alerts[0], plan, legs, claim: 'over_quota' });
    await runSender(Date.parse(alerts[0].due_at));
    assert.equal(texts.length, 0);
    assert.equal(emails.length, 1);
    assert.match(emails[0].subject, /100% of today's SMS quota used/);
});

test('sender: a rider who opted out since the morning gets nothing', async () => {
    const { plan, legs, alerts } = realPlan();
    senderDb({ alert: alerts[0], plan, legs, profile: { mobile_number: PHONE, sms_opted_in: false, mobile_verified: true } });
    const r = await runSender(Date.parse(alerts[0].due_at));
    assert.equal(r.skipped, 1);
    assert.equal(callsTo('rpc/release_alert').length, 1, 'the quota unit is given back');
    assert.equal(texts.length, 0);
});

test('sender: a rider an admin switched text alerts off for since the morning gets nothing', async () => {
    const { plan, legs, alerts } = realPlan();
    senderDb({ alert: alerts[0], plan, legs, revoked: true });
    const r = await runSender(Date.parse(alerts[0].due_at));
    assert.equal(r.skipped, 1);
    assert.equal(callsTo('rpc/release_alert').length, 1, 'the quota unit is given back');
    assert.equal(callsTo('alerts', 'PATCH').at(-1)!.body.status, 'skipped');
    assert.equal(texts.length, 0);
});

test('sender: Twilio saying the rider replied STOP opts them out here too', async () => {
    const { plan, legs, alerts } = realPlan();
    senderDb({ alert: alerts[0], plan, legs });
    setTwilioFails(new SendError('Attempt to send to unsubscribed recipient', 21610, 400));
    await runSender(Date.parse(alerts[0].due_at));
    assert.equal(callsTo('profiles', 'PATCH')[0].body.sms_opted_in, false);
    assert.equal(callsTo('alerts', 'PATCH').at(-1)!.body.status, 'failed');
    assert.equal(callsTo('rpc/release_alert').length, 0, 'not worth retrying');
});

test('sender: a Twilio outage is retried while the alert is still fresh', async () => {
    const { plan, legs, alerts } = realPlan();
    senderDb({ alert: alerts[0], plan, legs });
    setTwilioFails(new SendError('Service unavailable', null, 503));
    const r = await runSender(Date.parse(alerts[0].due_at));
    assert.equal(r.held, 1);
    assert.equal(callsTo('rpc/release_alert').length, 1);
    assert.equal(callsTo('messages', 'PATCH')[0].body.status, 'failed', 'the failed attempt stays in the log');
});

test('sender: SMS_ENABLED=false sends nothing at all', async () => {
    process.env.SMS_ENABLED = 'false';
    await runSender();
    assert.equal(calls.length, 0);
});

/* ── Planner ── */

const AT_0430 = Date.parse('2026-10-21T10:30:00Z');   // Wednesday 4:30 AM in Regina

function plannerDb(planned: string[] = [], revoked: string[] = []) {
    setRespond(c => {
        if (c.table === 'feature_access') return revoked.map(user_id => ({ user_id }));
        if (c.table === 'weekly_schedules') return [
            { id: 's1', user_id: 'u1', arrive_by: '09:00', depart_by: null, from_dest_id: 'd1', to_dest_id: 'd2' },
            { id: 's2', user_id: 'u2', arrive_by: '09:00', depart_by: null, from_dest_id: 'd1', to_dest_id: 'd2' },
            { id: 's3', user_id: 'u1', arrive_by: '04:40', depart_by: null, from_dest_id: 'd1', to_dest_id: 'd2' },
        ];
        if (c.table === 'trip_plans') return planned.map(schedule_id => ({ schedule_id }));
        if (c.table === 'profiles') return [
            { id: 'u1', mobile_number: PHONE, sms_opted_in: true, mobile_verified: true, account_status: 'active' },
            { id: 'u2', mobile_number: '+13065550222', sms_opted_in: false, mobile_verified: true, account_status: 'active' },
        ];
        if (c.table === 'saved_destinations') return [{ id: 'd1', name: 'Home', lat: 50.4479, lng: -104.6107 }, { id: 'd2', name: 'U of R', lat: 50.4154, lng: -104.5880 }];
        if (c.table === 'rpc/create_plan') return 'new-plan-id';
        return undefined;
    });
}

test('planner: plans each eligible commute once, with N + 1 alerts', async () => {
    plannerDb();
    const r = await runPlanner(new Date(AT_0430));
    assert.deepEqual({ planned: r.planned, ineligible: r.ineligible, tooLate: r.tooLate, failed: r.failed }, { planned: 1, ineligible: 1, tooLate: 1, failed: 0 });
    assert.equal(filter(callsTo('weekly_schedules')[0], 'day_of_week'), '3', 'Wednesday');
    const { p_plan, p_legs, p_alerts, p_daily_max } = callsTo('rpc/create_plan')[0].body;
    assert.equal(p_plan.status, 'planned');
    assert.equal(p_plan.service_date, '2026-10-21');
    assert.equal(p_alerts.length, p_legs.length + 1);
    assert.equal(p_daily_max, 500);
    assert.ok(timetable().stopIndex(p_legs[0].board_stop_id) !== undefined);
});

test('planner: a rider an admin switched text alerts off for is not planned', async () => {
    plannerDb([], ['u1']);
    const r = await runPlanner(new Date(AT_0430));
    assert.deepEqual({ planned: r.planned, ineligible: r.ineligible }, { planned: 0, ineligible: 2 });
    assert.equal(callsTo('rpc/create_plan').length, 0);
});

test('planner: a commute already planned today is left alone', async () => {
    plannerDb(['s1']);
    const r = await runPlanner(new Date(AT_0430));
    assert.equal(r.alreadyPlanned, 1);
    assert.equal(callsTo('rpc/create_plan').length, 0);
});

test('planner: an expired timetable plans nothing and tells the admins once', async () => {
    plannerDb();
    const later = new Date('2028-01-05T10:30:00Z');
    await runPlanner(later);
    await runPlanner(later);
    assert.equal(callsTo('weekly_schedules').length, 0, 'no "no buses" plans from a stale timetable');
    assert.equal(emails.length, 1);
    assert.match(emails[0].subject, /Timetable out of date/);
});

/* ── Tracker ── */

function trackerDb(plan: PlanDb, legs: LegDb[], alerts: AlertDb[]) {
    setRespond(c => {
        if (c.table === 'alerts' && c.method === 'GET') return alerts.filter(a => a.status === 'pending');
        if (c.table === 'trip_plans' && c.method === 'GET') return c.query.has('arrive_at') ? [] : [plan];
        if (c.table === 'trip_legs' && c.method === 'GET') return legs;
        return undefined;
    });
}
const prediction = (stopId: string, route: string, at: string | Date, busId: number | null) =>
    ({ pred_time: clockAt(at), bus_id: busId, route_id: Number(route), stop_id: stopId });

test('tracker: matches the live bus and moves "leave now" to its live time', async () => {
    const { plan, legs, alerts } = realPlan();
    const leg = legs[0], sched = Date.parse(leg.sched_board_at);
    live.predictions.set(leg.board_stop_id, [prediction(leg.board_stop_id, leg.route_num, new Date(sched + 4 * 60_000), 777)]);
    trackerDb(plan, legs, alerts);
    await runTracker(sched - 15 * 60_000);
    const matched = callsTo('trip_legs', 'PATCH')[0];
    assert.equal(matched.body.bus_id, '777');
    assert.equal(matched.body.live_board_at, new Date(sched + 4 * 60_000).toISOString());
    const shift = callsTo('alerts', 'PATCH').find(c => filter(c, 'id') === 'a1')!;
    assert.equal(Date.parse(shift.body.due_at) - Date.parse(alerts[0].due_at), 4 * 60_000, 'the bus is 4 minutes late, so is "leave now"');
});

test('tracker: "next stop" fires when the bus reaches the stop before the rider\'s', async () => {
    const { plan, legs, alerts } = realPlan();
    const leg = legs[0];
    const boarded = Date.parse(leg.sched_board_at) + 5 * 60_000;
    Object.assign(leg, { bus_id: '777', live_board_at: leg.sched_board_at, matched_at: new Date(boarded).toISOString() });
    const tt = timetable(), prev = tt.stopIndex(leg.prev_stop_id!)!;
    live.buses = [{ geometry: { coordinates: [tt.lng[prev], tt.lat[prev]] }, properties: { b: 777, r: Number(leg.route_num) } }];
    trackerDb(plan, legs, alerts.slice(1));
    await runTracker(boarded);
    const fire = callsTo('alerts', 'PATCH').find(c => filter(c, 'id') === 'a2')!;
    assert.equal(fire.body.due_at, new Date(boarded).toISOString());
});

test('tracker: a transfer that will be missed drops the rest of the trip\'s alerts and sends nothing new', async () => {
    // a real Sunday trip with one transfer (Route 2, then Route 12)
    const tt = timetable(), date = '2026-10-25', dest = { lat: 50.4600, lng: -104.6800 };
    const rows = buildPlan(tt, date, { scheduleId: 's1', userId: 'u1', arriveBy: '09:00', departBy: null, originName: 'A', destinationName: 'B' },
        planArriveBy(tt, date, { lat: 50.4500, lng: -104.5300 }, dest, 540), 270);
    assert.equal(rows.legs.length, 2, 'the fixture needs a transfer');
    const plan: PlanDb = { id: 'p1', ...rows.plan, status: 'active', notice: rows.plan.notice as PlanDb['notice'] };
    const legs: LegDb[] = rows.legs.map(l => ({ ...l, id: `l${l.seq}`, plan_id: 'p1', bus_id: null, live_board_at: null, live_alight_at: null, matched_at: null }));
    const alerts: AlertDb[] = rows.alerts.slice(1).map((a, i) => ({ id: `a${i + 2}`, plan_id: 'p1', leg_id: `l${a.leg_seq}`, user_id: 'u1', service_date: date, kind: a.kind, due_at: a.due_at, status: 'pending', attempts: 0 }));
    const [first, second] = legs;
    const onBus = Date.parse(first.sched_board_at) + 3 * 60_000;
    Object.assign(first, { bus_id: '555', live_board_at: first.sched_board_at, matched_at: new Date(onBus).toISOString() });
    // first bus running 6 minutes late at the transfer stop: the next bus leaves before the rider gets there
    live.predictions.set(first.alight_stop_id, [prediction(first.alight_stop_id, first.route_num, new Date(Date.parse(first.sched_alight_at) + 6 * 60_000), 555)]);
    live.predictions.set(second.board_stop_id, live.predictions.get(first.alight_stop_id)!);
    trackerDb(plan, legs, alerts);
    const r = await runTracker(onBus);
    assert.equal(r.missedTransfers, 1);
    const drop = callsTo('alerts', 'PATCH').find(c => c.body.status === 'skipped')!;
    assert.equal(filter(drop, 'leg_id'), `(${second.id})`, 'only the second bus\'s alerts');
    assert.equal(filter(drop, 'status'), 'pending');
    assert.equal(callsTo('alerts', 'POST').length, 0, 'no new alert is added');
    assert.equal(callsTo('rpc/create_plan').length, 0);
    assert.equal(texts.length, 0);
});

/* ── Daily report ── */

test('report: emails admins the summary and a two-tab workbook, once per day', async () => {
    const { legs } = realPlan();
    const sentAt = instantOf(DATE, 8 * 60 + 20).toISOString();
    setRespond(c => {
        if (c.table === 'trip_plans') return [{ id: 'p1', user_id: 'u1', arrive_by: '09:00', status: 'completed' }];
        if (c.table === 'messages' && c.method === 'GET') return [
            { id: 'm1', alert_id: 'a1', user_id: 'u1', kind: 'alert', status: 'delivered', segments: 1, price: null, price_unit: null, twilio_sid: 'SM1', dry_run: false, error_code: null, created_at: sentAt },
            { id: 'm2', alert_id: null, user_id: 'u1', kind: 'reply', status: 'sent', segments: 1, price: null, price_unit: null, twilio_sid: null, dry_run: false, error_code: null, created_at: sentAt },
        ];
        if (c.table === 'alerts') return [{ id: 'a1', plan_id: 'p1', leg_id: 'l1', kind: 'leave_now', status: 'sent' }];
        if (c.table === 'trip_legs') return legs;
        if (c.table === 'profiles') return [{ id: 'u1', email: 'rider@example.test' }];
        return undefined;
    });
    const r = await runDailyReport(Date.parse('2026-10-22T08:00:00Z'));   // 2 AM the next day
    assert.equal(r, 'sent');
    assert.equal(callsTo('daily_reports', 'POST')[0].body.service_date, DATE);
    assert.equal(callsTo('messages', 'PATCH')[0].body.price, -0.0083, 'missing prices are fetched from Twilio');
    assert.equal(emails.length, 1);
    assert.equal(emails[0].subject, `[Transit Regina SMS] Daily SMS report for ${DATE}`);
    assert.match(emails[0].text, /Riders served: 1/);
    assert.match(emails[0].text, /1 alerts, 1 replies, 0 broadcasts/);
    const zip = await JSZip.loadAsync(emails[0].attachments![0].content);
    const requests = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
    assert.match(requests, /rider@example\.test/);
    assert.match(requests, new RegExp(legs[0].route_num));
    const hourly = await zip.file('xl/worksheets/sheet2.xml')!.async('string');
    // row 1 is the header and hour 0 is row 2, so 09:00 is row 11
    assert.match(hourly, /<row r="11"><c r="A11" t="inlineStr"><is><t xml:space="preserve">09:00<\/t><\/is><\/c><c r="B11"><v>1<\/v>/, 'one rider asked to arrive in the 9 o\'clock hour');
    assert.match(hourly, /<c r="C10"><v>2<\/v>/, 'two texts went out in the 8 o\'clock hour');
});

test('report: a day already reported is not emailed again', async () => {
    setRespond(c => c.table === 'daily_reports' && c.method === 'POST' ? [409, { message: 'duplicate key value violates unique constraint "daily_reports_pkey"', code: '23505' }] : undefined);
    assert.equal(await runDailyReport(Date.parse('2026-10-22T08:00:00Z')), 'already');
    assert.equal(emails.length, 0);
});
