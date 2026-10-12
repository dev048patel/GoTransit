/**
 * ReginaTime — day boundaries in Regina's clock.
 *
 * The backend runs in UTC, but "Monday" for a rider means Monday in Regina. Saskatchewan is
 * UTC−6 all year (no daylight saving), so a fixed offset is exact. Without this, anything after
 * 6 p.m. local time is counted on the next day.
 */
const OFFSET_MS = 6 * 60 * 60 * 1000;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** The moment shifted so its UTC fields read as Regina wall-clock time. */
const shifted = (when: Date | string | number) => new Date(new Date(when).getTime() - OFFSET_MS);

/** 'Mon', 'Tue', … for the Regina day a moment falls on. */
export function reginaWeekday(when: Date | string | number): typeof DAYS[number] {
    return DAYS[shifted(when).getUTCDay()];
}

/** 'YYYY-MM-DD' of the Regina day a moment falls on. */
export function reginaDateKey(when: Date | string | number): string {
    return shifted(when).toISOString().slice(0, 10);
}

/** The instant a Regina day starts. daysFromToday: 0 = today, −1 = yesterday, … */
export function startOfReginaDay(daysFromToday = 0, now: Date | number = Date.now()): Date {
    const s = shifted(now);
    return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate() + daysFromToday) + OFFSET_MS);
}

/** The instant the current Regina week (Monday–Sunday) starts. */
export function startOfReginaWeek(now: Date | number = Date.now()): Date {
    const dow = shifted(now).getUTCDay();            // 0 = Sunday
    return startOfReginaDay(-(dow === 0 ? 6 : dow - 1), now);
}
