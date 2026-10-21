/**
 * The words of every text. Each one is written to fit one GSM-7 segment (160 characters): when it
 * doesn't, stop names are shortened step by step (direction dropped, then cut) rather than the
 * instruction.
 */
import { toGsm, gsmLength } from './gsm';
import { clock, clockAt } from '../time';

export const MAX_CHARS = 160;
const OPT_OUT = 'Reply STOP to opt out.';

/** A stop name at a given level of shortening: 0 full, 1 without "(EB)", 2 cut to 24 characters */
function stopName(name: string, level: number): string {
    let s = toGsm(name);
    if (level >= 1) s = s.replace(/\s*\((NB|SB|EB|WB)\)\s*$/i, '');
    if (level >= 2 && s.length > 24) s = s.slice(0, 23).trimEnd() + '.';
    return s;
}

/** Renders with full stop names, then shorter ones, until the text fits one segment */
function fit(render: (name: (n: string) => string) => string): string {
    for (let level = 0; level <= 2; level++) {
        const text = toGsm(render(n => stopName(n, level)));
        if (gsmLength(text) <= MAX_CHARS) return text;
    }
    const text = toGsm(render(n => stopName(n, 2)));
    return text.slice(0, MAX_CHARS);
}

const walk = (minutes: number) => `${minutes} min`;
const km = (metres: number) => (metres / 1000).toFixed(1);

export interface LegText {
    route: string;
    boardName: string;
    alightName: string;
    walkBeforeMin: number;
    /** the time the bus leaves the boarding stop: live when known, else the timetable's */
    boardAt: Date | string;
    live: boolean;
}

export function leaveNowText(first: LegText): string {
    return fit(n => `TransitR: Leave now. Walk ${walk(first.walkBeforeMin)} to ${n(first.boardName)}. Route ${first.route} is due ${clockAt(first.boardAt)}${first.live ? '' : ' (timetable)'}. ${OPT_OUT}`);
}

/** "Get off at the next stop", then what comes after: the next bus, or the walk to the destination */
export function alightText(leg: LegText, next: LegText | null, walkAfterMin: number, arriveAt: Date | string, live: boolean): string {
    const timing = live ? '' : ' Timing is from the timetable.';
    const getOff = (n: (s: string) => string) => `TransitR: Get off at the NEXT stop (${n(leg.alightName)}).`;
    if (next && next.boardName === leg.alightName) {
        return fit(n => `${getOff(n)} Then take Route ${next.route} at the same stop, due ${clockAt(next.boardAt)}.${timing}`);
    }
    if (next) {
        return fit(n => `${getOff(n)} Then walk ${walk(next.walkBeforeMin)} to ${n(next.boardName)} for Route ${next.route}, due ${clockAt(next.boardAt)}.${timing}`);
    }
    return fit(n => `${getOff(n)} Then walk ${walk(walkAfterMin)} to your destination, arriving about ${clockAt(arriveAt)}.${timing}`);
}

/** The last bus of a partial trip: there is no bus for the rest of the way */
export function partialAlightText(leg: LegText, remainingMetres: number, live: boolean): string {
    return fit(n => `TransitR: Get off at the NEXT stop (${n(leg.alightName)}). No bus goes further in time; your destination is ${km(remainingMetres)} km from there.${live ? '' : ' Timing is from the timetable.'}`);
}

export function partialText(first: LegText, lastStopName: string, reachAt: Date | string, remainingMetres: number): string {
    return fit(n => `TransitR: Buses only get you to ${n(lastStopName)} by ${clockAt(reachAt)}, ${km(remainingMetres)} km from your destination. Leave now for Route ${first.route} at ${n(first.boardName)}. ${OPT_OUT}`);
}

export function noServiceText(arriveBy: string, earliest: { leaveAt: Date | string; arriveAt: Date | string; route: string } | null): string {
    const by = clock(parseArrive(arriveBy));
    if (earliest) return fit(() => `TransitR: No bus trip gets you there by ${by} today. The earliest is Route ${earliest.route}: leave ${clockAt(earliest.leaveAt)}, arrive about ${clockAt(earliest.arriveAt)}. ${OPT_OUT}`);
    return fit(() => `TransitR: No buses can get you there by ${by} today. Check the TransitR app for other times. ${OPT_OUT}`);
}

export const HELP_TEXT = 'TransitR commute alerts: texts for the commute saved in your profile. Reply STOP to opt out.';

function parseArrive(arriveBy: string): number {
    const [h, m] = arriveBy.split(':').map(Number);
    return h * 60 + (m || 0);
}
