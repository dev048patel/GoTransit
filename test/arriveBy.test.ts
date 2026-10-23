/* "Arrive by" planning on the real timetable: the trip it picks gets the rider there in time */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArriveByService } from '../src/models/services/ArriveByService';

// A weekday inside the timetable's dates, 11:15 AM in Regina (UTC−6)
const NOW = new Date('2026-10-23T17:15:00Z');
const HILLSDALE = { lat: 50.4205, lng: -104.6 };
const EAST = { lat: 50.4195, lng: -104.5655 };

/** "1:58 PM" → minutes after midnight */
const minutes = (clock: string) => {
    const [, h, m, ap] = /^(\d+):(\d+) (AM|PM)$/.exec(clock)!;
    return (Number(h) % 12) * 60 + Number(m) + (ap === 'PM' ? 720 : 0);
};

test('plans a real bus that arrives by the chosen time, not the next bus now', () => {
    const plan = ArriveByService.plan(HILLSDALE, EAST, 14 * 60 + 13, NOW);
    assert.equal(plan.status, 'planned');
    if (plan.status !== 'planned') return;
    assert.equal(plan.day, 'today');
    const [journey] = plan.journeys;
    assert.ok(journey.legs.length >= 1);
    assert.ok(minutes(journey.arrive) <= 14 * 60 + 13, `arrives ${journey.arrive}, by 2:13 PM`);
    assert.ok(minutes(journey.legs[0].board) > 13 * 60, `boards ${journey.legs[0].board}: close to the time asked, not now (11:15 AM)`);
    assert.ok(minutes(journey.leave) <= minutes(journey.legs[0].board), 'leaves before the bus comes');
    for (const leg of journey.legs) assert.ok(leg.boardStop.name && leg.alightStop.name && leg.route);
});

test('offers backups: each further option arrives in time and earlier than the one before', () => {
    const plan = ArriveByService.plan(HILLSDALE, EAST, 14 * 60 + 13, NOW);
    assert.equal(plan.status, 'planned');
    if (plan.status !== 'planned') return;
    assert.ok(plan.journeys.length > 1, `${plan.journeys.length} option(s)`);
    assert.ok(plan.journeys.length <= 3);
    for (let i = 1; i < plan.journeys.length; i++) {
        assert.ok(minutes(plan.journeys[i].arrive) < minutes(plan.journeys[i - 1].arrive), 'each backup arrives earlier');
    }
});

test('a time that has already passed today plans for tomorrow', () => {
    const plan = ArriveByService.plan(HILLSDALE, EAST, 9 * 60, NOW);
    assert.equal(plan.day, 'tomorrow');
});
