/**
 * Regina time. Saskatchewan is UTC−6 all year (no daylight saving), so a fixed offset is exact.
 * A "service day" is a Regina calendar date; GTFS times are minutes after that day's midnight.
 */
const OFFSET_MS = 6 * 60 * 60 * 1000;
const shifted = (when: Date | number) => new Date(+when - OFFSET_MS);

/** 'YYYY-MM-DD' of the Regina day a moment falls on */
export function reginaDate(when: Date | number = Date.now()): string {
    return shifted(when).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, in Regina (same numbering as weekly_schedules.day_of_week) */
export function reginaWeekday(when: Date | number = Date.now()): number {
    return shifted(when).getUTCDay();
}

/** Minutes since Regina midnight */
export function reginaMinutes(when: Date | number = Date.now()): number {
    const s = shifted(when);
    return s.getUTCHours() * 60 + s.getUTCMinutes() + s.getUTCSeconds() / 60;
}

/** The instant `minutes` after midnight of a Regina service date */
export function instantOf(serviceDate: string, minutes: number): Date {
    const [y, m, d] = serviceDate.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d) + OFFSET_MS + Math.round(minutes * 60_000));
}

/** Minutes after midnight of `serviceDate` for an instant (may exceed 1440 or be negative) */
export function minutesOn(serviceDate: string, when: Date | number | string): number {
    return (+new Date(when) - +instantOf(serviceDate, 0)) / 60_000;
}

/** "HH:MM" → minutes, or null when it is not a time */
export function parseHhmm(v: unknown): number | null {
    const m = typeof v === 'string' ? /^(\d{1,2}):(\d{2})/.exec(v) : null;
    if (!m) return null;
    const h = Number(m[1]), min = Number(m[2]);
    return h < 24 && min < 60 ? h * 60 + min : null;
}

/** "7:42 AM" for minutes after midnight */
export function clock(minutes: number): string {
    const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
    const h = Math.floor(total / 60), m = total % 60;
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "7:42 AM" for an instant */
export function clockAt(when: Date | number | string): string {
    return clock(reginaMinutes(+new Date(when)));
}

/** 'YYYYMMDD' (GTFS) for 'YYYY-MM-DD' */
export const gtfsDate = (serviceDate: string) => serviceDate.replace(/-/g, '');

/** The Regina date `days` after `serviceDate` */
export function addDays(serviceDate: string, days: number): string {
    return new Date(Date.parse(serviceDate + 'T00:00:00Z') + days * 86_400_000).toISOString().slice(0, 10);
}
