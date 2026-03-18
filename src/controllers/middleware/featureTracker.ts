/*
  Feature Usage Tracker (Supabase-backed)
  Records "places" (search) and "directions" events.

  - Frontend fires POST /api/features/track on each action
  - Events persist in the `feature_events` Supabase table
  - Aggregation helpers return weekly bar-chart and daily pie-chart data
*/

import { supabaseServer } from '../../models/lib/supabaseServer';

type FeatureType = 'places' | 'directions';

// Day names in order (Mon–Sun)
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ── Public API ──────────────────────────────────────────────────── */

/** Record a single feature event. */
export async function recordFeatureEvent(type: FeatureType): Promise<void> {
    await supabaseServer
        .from('feature_events')
        .insert({ type });
}

/**
 * Weekly bar-chart data: { day, places, directions } for each day of the current week.
 * Week starts on Monday and ends on Sunday.
 */
export async function getWeeklyFeatureData(): Promise<{ day: string; places: number; directions: number }[]> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sundayEnd = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch this week's events from DB
    const { data: events } = await supabaseServer
        .from('feature_events')
        .select('type, created_at')
        .gte('created_at', monday.toISOString())
        .lt('created_at', sundayEnd.toISOString());

    // Build 7 day buckets (Mon–Sun)
    const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const buckets: Record<string, { places: number; directions: number }> = {};
    orderedDays.forEach(d => { buckets[d] = { places: 0, directions: 0 }; });

    for (const e of events ?? []) {
        const dayName = DAY_NAMES[new Date(e.created_at).getDay()];
        if (buckets[dayName]) {
            buckets[dayName][e.type as FeatureType]++;
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
 */
export async function getDailyTrafficData(): Promise<{ name: string; value: number }[]> {
    const { data: events } = await supabaseServer
        .from('feature_events')
        .select('created_at');

    const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts: Record<string, number> = {};
    orderedDays.forEach(d => { counts[d] = 0; });

    for (const e of events ?? []) {
        const dayName = DAY_NAMES[new Date(e.created_at).getDay()];
        if (counts[dayName] !== undefined) {
            counts[dayName]++;
        }
    }

    return orderedDays.map(name => ({ name, value: counts[name] }));
}

/** Total event count (for the "Avg Daily Interactions" metric card). */
export async function getTotalInteractions(): Promise<number> {
    const { count } = await supabaseServer
        .from('feature_events')
        .select('*', { count: 'exact', head: true });

    return count ?? 0;
}
