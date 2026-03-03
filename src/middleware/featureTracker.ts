/*
  Feature Usage Tracker
  Records "places" (search) and "directions" (trip planner) events.

  - Frontend fires POST /api/features/track on each action
  - Events stored in memory with timestamps
  - Aggregation helpers return weekly bar-chart and daily pie-chart data
  - Data resets on server restart (same as visitorTracker)
*/

type FeatureType = 'places' | 'directions';

interface FeatureEvent {
    type: FeatureType;
    timestamp: string; // ISO string
}

// In-memory event log
const events: FeatureEvent[] = [];

// Day names in order (Mon–Sun)
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ── Public API ──────────────────────────────────────────────────── */

/** Record a single feature event. */
export function recordFeatureEvent(type: FeatureType): void {
    events.push({ type, timestamp: new Date().toISOString() });
}

/**
 * Weekly bar-chart data: { day, places, directions } for each day of the current week.
 * Week starts on Monday and ends on Sunday.
 */
export function getWeeklyFeatureData(): { day: string; places: number; directions: number }[] {
    const now = new Date();
    // Find the most recent Monday at 00:00
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);

    // Build 7 day buckets (Mon–Sun)
    const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const buckets: Record<string, { places: number; directions: number }> = {};
    orderedDays.forEach(d => { buckets[d] = { places: 0, directions: 0 }; });

    // Filter events to this week and bucket them
    const mondayMs = monday.getTime();
    const sundayEndMs = mondayMs + 7 * 24 * 60 * 60 * 1000;

    for (const e of events) {
        const t = new Date(e.timestamp).getTime();
        if (t < mondayMs || t >= sundayEndMs) continue;
        const dayName = DAY_NAMES[new Date(e.timestamp).getDay()];
        if (buckets[dayName]) {
            buckets[dayName][e.type]++;
        }
    }

    return orderedDays.map(day => ({
        day,
        places: buckets[day].places,
        directions: buckets[day].directions,
    }));
}

/**
 * Daily pie-chart data: total interactions per weekday across ALL recorded history.
 * Gives a distribution like "Fridays are the busiest".
 */
export function getDailyTrafficData(): { name: string; value: number }[] {
    const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts: Record<string, number> = {};
    orderedDays.forEach(d => { counts[d] = 0; });

    for (const e of events) {
        const dayName = DAY_NAMES[new Date(e.timestamp).getDay()];
        if (counts[dayName] !== undefined) {
            counts[dayName]++;
        }
    }

    return orderedDays.map(name => ({ name, value: counts[name] }));
}

/** Total event count (for the "Avg Daily Interactions" metric card). */
export function getTotalInteractions(): number {
    return events.length;
}
