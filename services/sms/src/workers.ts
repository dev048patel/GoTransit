/**
 * The service's timers. Each worker runs on its own interval, never overlaps itself, and logs (rather
 * than crashes on) a failed run, so one broken job can't stop the others.
 *
 *   sender     every 5 s     send due alerts
 *   tracker    every 15 s    live buses, "next stop" timing, drops a missed transfer's alerts
 *   heartbeat  every 30 s
 *   planner    every 10 min  from 04:30 to 23:00
 *   report     every 10 min  from 01:00 to 06:00 (sends once per day)
 *   retention  every hour    from 03:00 to 04:00
 */
import { runSender } from './jobs/sender';
import { runTracker } from './jobs/tripTracker';
import { runPlanner } from './jobs/dailyPlanner';
import { runDailyReport } from './jobs/dailyReport';
import { runRetention, writeHeartbeat } from './jobs/maintenance';
import { reginaMinutes } from './time';

interface Worker { name: string; everyMs: number; window?: [fromMin: number, toMin: number]; run: () => Promise<unknown> }
interface State { lastStart: string | null; lastOk: string | null; lastError: string | null; running: boolean }

const WORKERS: Worker[] = [
    { name: 'sender', everyMs: 5_000, run: () => runSender() },
    { name: 'tracker', everyMs: 15_000, run: () => runTracker() },
    { name: 'heartbeat', everyMs: 30_000, run: () => writeHeartbeat({ workers: status() }) },
    { name: 'planner', everyMs: 10 * 60_000, window: [4 * 60 + 30, 23 * 60], run: () => runPlanner() },
    { name: 'report', everyMs: 10 * 60_000, window: [60, 6 * 60], run: () => runDailyReport() },
    { name: 'retention', everyMs: 60 * 60_000, window: [3 * 60, 4 * 60], run: () => runRetention() },
];

const states = new Map<string, State>(WORKERS.map(w => [w.name, { lastStart: null, lastOk: null, lastError: null, running: false }]));
const timers: NodeJS.Timeout[] = [];

/** What each worker last did, for the heartbeat (read by the main API with the service key) */
export function status(): Record<string, Omit<State, 'running'>> {
    return Object.fromEntries([...states].map(([name, { running: _r, ...s }]) => [name, s]));
}

/** The same without error messages, for the public /health endpoint */
export function publicStatus(): Record<string, { lastOk: string | null; failing: boolean }> {
    return Object.fromEntries([...states].map(([name, s]) => [name, { lastOk: s.lastOk, failing: !!s.lastError }]));
}

async function tick(w: Worker): Promise<void> {
    const s = states.get(w.name)!;
    if (s.running) return;
    if (w.window) {
        const m = reginaMinutes();
        if (m < w.window[0] || m >= w.window[1]) return;
    }
    s.running = true;
    s.lastStart = new Date().toISOString();
    try {
        await w.run();
        s.lastOk = new Date().toISOString();
        s.lastError = null;
    } catch (err) {
        const message = (err as Error).message.slice(0, 300);
        // the same failure every 5 seconds is one problem, not hundreds: log it when it starts or changes
        if (message !== s.lastError) console.error(`[${w.name}] ${message}`);
        s.lastError = message;
    } finally {
        s.running = false;
    }
}

export function startWorkers(): void {
    for (const w of WORKERS) {
        void tick(w);
        timers.push(setInterval(() => void tick(w), w.everyMs));
    }
}

export function stopWorkers(): void {
    while (timers.length) clearInterval(timers.pop());
}
