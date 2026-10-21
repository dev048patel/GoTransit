/**
 * The service's logic without a database: planning, alert counts, message text, the workbook.
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { Timetable, RawTimetable } from '../src/transit/timetable';
import { planArriveBy } from '../src/transit/planner';
import { buildPlan } from '../src/alerts/buildAlerts';
import { segments, toGsm, gsmLength } from '../src/alerts/gsm';
import { alightText, leaveNowText, noServiceText, partialText, HELP_TEXT } from '../src/alerts/messages';
import { isFresh } from '../src/jobs/sender';
import { buildWorkbook } from '../src/report/xlsx';
import { predictionMinutes, sameRoute } from '../src/transit/transitLive';
import { clock, instantOf, minutesOn, reginaDate, reginaMinutes } from '../src/time';

/*  A small made-up network on a straight line, stops ~1 km apart:
      A ── B ── C ── D ── E
    Route 1  A→B→C   leaves A at 7:00, 7:30, 8:00       (5 min a stop)
    Route 2  C→D→E   leaves C at 7:20, 7:50, 8:20
    Route 3  A→…→E   one trip, only in some tests        */
const STEP = 0.0095;                       // ~1.06 km of latitude
const at = (i: number) => ({ lat: 50.40 + i * STEP, lng: -104.60 });
const DATE = '2026-10-21';
function network(direct?: number): Timetable {
    const stops: RawTimetable['stops'] = ['A', 'B', 'C', 'D', 'E'].map((id, i) => [id, `Stop ${id} (NB)`, at(i).lat, at(i).lng]);
    const trips = (first: number[], stopsN: number) => first.map(t => [0, ...Array.from({ length: stopsN }, (_, i) => t + 5 * i)]);
    const patterns: RawTimetable['patterns'] = [
        { route: '1', headsign: 'C', stops: [0, 1, 2], trips: trips([420, 450, 480], 3) },
        { route: '2', headsign: 'E', stops: [2, 3, 4], trips: trips([440, 470, 500], 3) },
    ];
    if (direct !== undefined) patterns.push({ route: '3', headsign: 'E', stops: [0, 1, 2, 3, 4], trips: trips([direct], 5) });
    return new Timetable({ version: 1, builtAt: '', feed: { start: '20260101', end: '20271231' }, stops, services: [['WK', '1111111', '20260101', '20271231', [], []]], patterns, footpaths: [] });
}

test('planner: one transfer, leaving as late as still arrives on time', () => {
    const r = planArriveBy(network(), DATE, at(0), at(4), 8 * 60 + 20);
    assert.equal(r.status, 'planned');
    if (r.status !== 'planned') return;
    assert.deepEqual(r.journey.legs.map(l => l.route), ['1', '2']);
    assert.equal(clock(r.journey.leaveMin), '7:29 AM');     // the 7:30 bus, one minute's walk to the stop
    assert.equal(clock(r.journey.arriveMin), '8:01 AM');    // Route 2 at 7:50 reaches E at 8:00, then the walk
    assert.equal(r.journey.legs[1].prevStop, 3, '"next stop" is sent near D, the stop before E');
});

test('planner: a direct bus beats a transfer, even leaving a little earlier', () => {
    const later = planArriveBy(network(7 * 60 + 45), DATE, at(0), at(4), 8 * 60 + 20);
    assert.equal(later.status === 'planned' && later.journey.legs.length, 1);
    // direct leaves 7:24, the transfer 7:29: within the 10-minute allowance, so still direct
    const earlier = planArriveBy(network(7 * 60 + 25), DATE, at(0), at(4), 8 * 60 + 20);
    assert.equal(earlier.status === 'planned' && earlier.journey.legs.length, 1);
    // direct leaves 7:04: 25 minutes earlier is too much to save one transfer
    const muchEarlier = planArriveBy(network(7 * 60 + 5), DATE, at(0), at(4), 8 * 60 + 20);
    assert.equal(muchEarlier.status === 'planned' && muchEarlier.journey.legs.length, 2);
});

test('planner: no bus near the destination gives a partial trip, with the distance left', () => {
    const farAway = { lat: at(4).lat + 0.03, lng: -104.60 };     // 3.3 km past E, no stops near it
    const r = planArriveBy(network(), DATE, at(0), farAway, 9 * 60);
    assert.equal(r.status, 'partial');
    if (r.status !== 'partial') return;
    assert.equal(r.journey.legs.at(-1)!.alightStop, 4);
    assert.ok(Math.abs(r.remainingMetres - 3336) < 20, `remaining ${r.remainingMetres}`);
});

test('planner: nothing in time gives no_service, with the earliest possible trip', () => {
    const r = planArriveBy(network(), DATE, at(0), at(4), 6 * 60);
    assert.equal(r.status, 'no_service');
    if (r.status !== 'no_service') return;
    assert.equal(clock(r.earliest!.arriveMin), '7:31 AM');
    assert.equal(clock(r.earliest!.leaveMin), '6:59 AM');
});

test('planner: a service that does not run that day plans nothing', () => {
    const tt = network();
    (tt as any).services[0][1] = '1111100';                       // weekdays only
    assert.equal(planArriveBy(tt, '2026-10-25', at(0), at(4), 8 * 60 + 20).status, 'no_service');   // a Sunday
    assert.equal(tt.covers('2028-01-01'), false);
});

const commute = { scheduleId: 's1', userId: 'u1', arriveBy: '08:20', departBy: null, originName: 'Home', destinationName: 'Work' };

test('alerts: N buses get N + 1 alerts — 2 for a direct trip, 3 with one transfer', () => {
    const direct = buildPlan(network(7 * 60 + 45), DATE, commute, planArriveBy(network(7 * 60 + 45), DATE, at(0), at(4), 500), 270);
    assert.deepEqual(direct.alerts.map(a => a.kind), ['leave_now', 'alight']);
    const transfer = buildPlan(network(), DATE, commute, planArriveBy(network(), DATE, at(0), at(4), 500), 270);
    assert.deepEqual(transfer.alerts.map(a => a.kind), ['leave_now', 'alight', 'alight']);
    assert.equal(transfer.legs.length, 2);
    // leave now = 3 minutes before the rider must leave; next stop = 2 minutes before the bus gets there
    assert.equal(transfer.alerts[0].due_at, instantOf(DATE, 7 * 60 + 26).toISOString());
    assert.equal(transfer.alerts[2].due_at, instantOf(DATE, 7 * 60 + 58).toISOString());
    assert.deepEqual(transfer.alerts.map(a => a.key), ['leave_now', 'leg1:alight', 'leg2:alight']);
});

test('alerts: no service is one notice; a partial trip is a notice plus its "next stop" alerts', () => {
    const none = buildPlan(network(), DATE, { ...commute, arriveBy: '06:00' }, planArriveBy(network(), DATE, at(0), at(4), 360), 270);
    assert.deepEqual(none.alerts.map(a => a.kind), ['notice']);
    assert.equal(none.legs.length, 0);
    assert.equal(none.alerts[0].due_at, instantOf(DATE, 5 * 60 + 15).toISOString(), '45 min before arrival when no usual departure is saved');
    const partial = buildPlan(network(), DATE, commute, planArriveBy(network(), DATE, at(0), { lat: at(4).lat + 0.03, lng: -104.6 }, 540), 270);
    assert.deepEqual(partial.alerts.map(a => a.kind), ['notice', 'alight', 'alight']);
});

test('alerts: a plan made late never schedules a text in the past', () => {
    const r = buildPlan(network(), DATE, commute, planArriveBy(network(), DATE, at(0), at(4), 500), 7 * 60 + 28);
    assert.equal(r.alerts[0].due_at, instantOf(DATE, 7 * 60 + 28).toISOString());
});

test('gsm: look-alike characters are swapped so a text stays in the 160-character alphabet', () => {
    assert.equal(toGsm('Bus 4 → arrive by 08:25 – “quick”'), 'Bus 4 to arrive by 08:25 - "quick"');
    assert.equal(segments('Transit Regina: Leave by 07:42 for Bus 4 → arrive by 08:25. Reply STOP to unsubscribe.'), 2, "today's reminder, with its arrow, bills as 2 segments");
    assert.equal(segments(toGsm('Transit Regina: Leave by 07:42 for Bus 4 → arrive by 08:25. Reply STOP to unsubscribe.')), 1);
    assert.equal(toGsm('Crêpe Montréal 🚌'), 'Crepe Montréal', 'é is GSM-7 and stays; ê is not and loses its accent; the emoji goes');
    assert.equal(segments('x'.repeat(161)), 2);
});

test('messages: every text fits one segment, even with long stop names', () => {
    const long = 'University Of Regina Riddell Centre Northbound Loop (NB)';
    const leg = { route: '30', boardName: long, alightName: long, walkBeforeMin: 12, boardAt: instantOf(DATE, 446), live: false };
    const all = [
        leaveNowText(leg), alightText(leg, leg, 0, instantOf(DATE, 500), false), alightText(leg, { ...leg, boardName: 'Other stop' }, 0, instantOf(DATE, 500), false),
        alightText(leg, null, 6, instantOf(DATE, 500), true), partialText(leg, long, instantOf(DATE, 500), 2100),
        noServiceText('08:25', { leaveAt: instantOf(DATE, 480), arriveAt: instantOf(DATE, 530), route: '3' }), noServiceText('08:25', null),
        HELP_TEXT,
    ];
    for (const t of all) {
        assert.ok(gsmLength(t) <= 160, `${gsmLength(t)} chars: ${t}`);
        assert.equal(segments(t), 1, t);
    }
    assert.match(leaveNowText(leg), /Route 30 is due 7:26 AM \(timetable\)/);
    assert.match(leaveNowText({ ...leg, live: true }), /due 7:26 AM\. Reply STOP to opt out\.$/);
    assert.match(alightText(leg, leg, 0, instantOf(DATE, 500), true), /Then take Route 30 at the same stop/);
});

test('sender: each kind of alert has its own freshness window', () => {
    const due = Date.parse('2026-10-21T13:00:00Z');
    assert.equal(isFresh({ kind: 'alight', due_at: new Date(due).toISOString() }, due + 59_000), true);
    assert.equal(isFresh({ kind: 'alight', due_at: new Date(due).toISOString() }, due + 61_000), false, 'a "next stop" a minute late is skipped');
    assert.equal(isFresh({ kind: 'leave_now', due_at: new Date(due).toISOString() }, due + 170_000), true);
    assert.equal(isFresh({ kind: 'notice', due_at: new Date(due).toISOString() }, due + 9 * 60_000), true);
});

test('time: Regina is UTC-6 all year', () => {
    const t = Date.parse('2026-10-21T03:30:00Z');            // 9:30 PM on the 20th in Regina
    assert.equal(reginaDate(t), '2026-10-20');
    assert.equal(reginaMinutes(t), 21 * 60 + 30);
    assert.equal(instantOf('2026-07-01', 8 * 60).toISOString(), '2026-07-01T14:00:00.000Z', 'no daylight saving in summer');
    assert.equal(minutesOn('2026-10-21', '2026-10-21T14:05:00Z'), 8 * 60 + 5);
    assert.equal(predictionMinutes('08:18 PM'), 20 * 60 + 18);
    assert.equal(predictionMinutes('12:05 AM'), 5);
    assert.ok(sameRoute(4, '4') && sameRoute('04', '4') && sameRoute('50a', '50A') && !sameRoute('4', '40'));
});

test('report workbook: two tabs, 24 hourly rows and a column chart bound to them', async () => {
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, users: h === 8 ? 5 : 0, sms: h === 7 ? 9 : 0 }));
    const buf = await buildWorkbook({ name: 'Requests', header: ['Email', 'Route'], rows: [['a&b@x.test', '4'], ['Total', '']], boldLastRow: true }, hours);
    const zip = await JSZip.loadAsync(buf);
    const workbook = await zip.file('xl/workbook.xml')!.async('string');
    assert.match(workbook, /name="Requests".*name="Requests by hour"/);
    const hourly = await zip.file('xl/worksheets/sheet2.xml')!.async('string');
    assert.equal((hourly.match(/<row /g) ?? []).length, 25, 'a header and 24 hours');
    assert.match(hourly, /<drawing r:id="rId1"\/>/);
    const chart = await zip.file('xl/charts/chart1.xml')!.async('string');
    assert.match(chart, /<c:barDir val="col"\/>/);
    assert.match(chart, /'Requests by hour'!\$B\$2:\$B\$25/);
    assert.match(chart, /<c:pt idx="8"><c:v>5<\/c:v>/);
    assert.match(await zip.file('xl/worksheets/sheet1.xml')!.async('string'), /a&amp;b@x\.test/);
    await assert.rejects(buildWorkbook({ name: 'R', header: [], rows: [] }, hours.slice(1)));
});

test('the real timetable loads and plans a weekday commute', () => {
    const tt = Timetable.load();
    assert.ok(tt.stopIds.length > 1000 && tt.patterns.length > 50);
    const r = planArriveBy(tt, DATE, { lat: 50.4479, lng: -104.6107 }, { lat: 50.4154, lng: -104.5880 }, 9 * 60);   // downtown to the university
    assert.equal(r.status, 'planned');
});
