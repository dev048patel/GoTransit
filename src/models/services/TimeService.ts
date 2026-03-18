/* TimeService — time formatting and ETA calculation helpers used by TrackingPanel */

// Format a Date to a short time string like "2:30 PM"
export function formatTime(d: Date): string {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Calculate estimated arrival time from now plus travel minutes
export function calculateArrivalTime(travelMinutes: number): Date {
    return new Date(Date.now() + travelMinutes * 60000);
}

// Parse a prediction time string like "01:18 PM" into a Date object (today)
export function parsePredictionTime(predTime: string): Date | null {
    const match = predTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;

    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const ap = match[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;

    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}

// Calculate board time for a segment: uses live prediction if available, otherwise estimates
export function calculateBoardTime(
    segIndex: number,
    predTime: string | undefined,
    walkMinutes: number,
    waitTime: number | undefined,
    prevSegmentsTotalTime: number,
    now: Date
): Date {
    // Use live prediction time if parseable
    if (predTime) {
        const parsed = parsePredictionTime(predTime);
        if (parsed) return parsed;
    }

    // Fallback: estimate based on walking time + previous segments
    if (segIndex === 0) {
        return new Date(now.getTime() + Math.max(walkMinutes, waitTime ?? walkMinutes) * 60000);
    }
    const firstWait = waitTime ?? walkMinutes;
    return new Date(now.getTime() + (Math.max(walkMinutes, firstWait) + prevSegmentsTotalTime + 5) * 60000);
}
