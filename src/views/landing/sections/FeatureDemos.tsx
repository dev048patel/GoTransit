/* Live demos for the landing page — small drawn versions of the app's screens, with sample data.
   They replace static screenshots, so they stay sharp at any size and never go out of date as photos. */
import React from 'react';
import { motion } from 'framer-motion';
import { Footprints, RefreshCw, Star } from 'lucide-react';
import { MARKER_CHARACTERS } from '../../../models/data/markerCharacters';

const fox = MARKER_CHARACTERS.find(c => c.id === 'fox')!.src;

/* Route colours as they appear on the real map */
const ROUTE: { [route: number]: string } = { 3: '#b08d4a', 4: '#b3b71a', 7: '#4472c4', 21: '#c8201c', 22: '#0b6b0b', 30: '#555555', 50: '#5c0a0a' };

function RoutePill({ route, label = `${route}` }: { route: number; label?: string }) {
    return (
        <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white whitespace-nowrap" style={{ background: ROUTE[route] }}>
            {label}
        </span>
    );
}

function LiveBadge() {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold tracking-wide text-green-700">
            <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
            </span>
            LIVE
        </span>
    );
}

/* ── A small drawn city with buses running their routes ──
   Drawn on a 400×400 canvas that is cropped to fit, so everything that matters sits near the middle. */
const LINES = [
    { route: 3, d: 'M -20,140 L 120,140 L 200,200 L 200,420', dur: 26 },
    { route: 7, d: 'M 60,-20 L 60,100 L 160,100 L 160,260 L 420,260', dur: 32 },
    { route: 4, d: 'M 420,120 L 280,120 L 280,200 L 120,200 L 120,420', dur: 30 },
    { route: 50, d: 'M -20,300 L 140,300 L 240,180 L 420,180', dur: 24 },
];
const STOPS = [[120, 140], [200, 200], [160, 100], [160, 260], [280, 120], [280, 200], [120, 200], [140, 300], [240, 180], [200, 300]];

export function MapCanvas({ className = '' }: { className?: string }) {
    return (
        <svg className={`absolute inset-0 w-full h-full ${className}`} viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
            <rect width="400" height="400" fill="#eef1f3" />
            {/* Park and lake */}
            <rect x="215" y="215" width="95" height="70" rx="10" fill="#d3ecd3" />
            <path d="M 232,262 Q 255,238 290,250 Q 305,268 280,278 Q 250,282 232,262 Z" fill="#b9dcf2" />
            <rect x="70" y="210" width="40" height="60" rx="8" fill="#d3ecd3" />
            {/* Streets */}
            {[20, 60, 100, 140, 180, 220, 260, 300, 340, 380].map(v => (
                <g key={v} stroke="#ffffff" strokeWidth={v === 180 || v === 260 ? 6 : 3}>
                    <line x1={v} y1="0" x2={v} y2="400" />
                    <line x1="0" y1={v} x2="400" y2={v} />
                </g>
            ))}
            {/* Routes, stops, then two buses on each route */}
            {LINES.map(l => (
                <path key={l.route} d={l.d} fill="none" stroke={ROUTE[l.route]} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.75" />
            ))}
            {STOPS.map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" fill="white" stroke="#5f6368" strokeWidth="1.5" />
            ))}
            {LINES.map(l => [0, l.dur / 2].map(offset => (
                <g key={`${l.route}-${offset}`}>
                    <rect x="-10" y="-7" width="20" height="14" rx="4" fill={ROUTE[l.route]} stroke="white" strokeWidth="1.5" />
                    <text y="3.2" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="white" fontFamily="Inter, sans-serif">{l.route}</text>
                    <animateMotion dur={`${l.dur}s`} begin={`-${offset}s`} repeatCount="indefinite" path={l.d} />
                </g>
            )))}
        </svg>
    );
}

/* The rider's own marker: a character with a soft pulse under it */
function YouAreHere({ className }: { className: string }) {
    return (
        <div className={`absolute -translate-x-1/2 -translate-y-1/2 ${className}`}>
            <span className="absolute inset-0 m-auto h-10 w-10 animate-ping rounded-full bg-orange-400/40" />
            <img src={fox} alt="" className="relative h-10 w-10 drop-shadow-md" />
        </div>
    );
}

/* ── See your bus in real time: the live map ── */
export function MapDemo() {
    return (
        <div className="relative h-full w-full overflow-hidden">
            <MapCanvas />
            <YouAreHere className="left-[44%] top-[62%]" />
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-md">
                <LiveBadge /> 8 buses on the map
            </div>
            <motion.div
                className="absolute bottom-3 right-3 rounded-2xl bg-white/95 px-4 py-3 shadow-lg"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
                <div className="flex items-center gap-2">
                    <RoutePill route={3} label="Route 3" />
                    <span className="text-xs text-[#1a73e8] font-semibold">Bus #639</span>
                </div>
                <div className="mt-1 text-sm font-bold text-gray-900">5 min away from your stop</div>
            </motion.div>
        </div>
    );
}

/* ── Live arrival times: the stop panel ── */
const ARRIVALS = [
    { route: 3, to: 'Sherwood Estates', rows: [['5 min', '10:45 AM', '#639'], ['20 min', '11:00 AM', '#639'], ['35 min', '11:15 AM', '#646'], ['65 min', '11:45 AM', '#668']] },
    { route: 30, to: 'Rochdale', rows: [['11 min', '10:51 AM', '#628'], ['40 min', '11:20 AM', '#684'], ['75 min', '11:55 AM', '#626']] },
    { route: 4, to: 'Walsh Acres', rows: [['13 min', '10:53 AM', '#814'], ['18 min', '10:58 AM', '#819'], ['47 min', '11:27 AM', '#814']] },
];

function ArrivalCard({ route, to, rows }: typeof ARRIVALS[number]) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-2.5" style={{ borderLeft: `4px solid ${ROUTE[route]}` }}>
            <div className="mb-1.5 flex items-center gap-2">
                <RoutePill route={route} label={`Route ${route}`} />
                <span className="flex-1 truncate text-xs font-medium text-gray-800">{to}</span>
                <LiveBadge />
            </div>
            {rows.map(([wait, time, bus], i) => (
                <div key={time} className={`flex items-center gap-2 rounded-md px-2 py-1 text-[11px] ${i === 0 ? 'bg-green-50' : i % 2 ? 'bg-gray-50' : ''}`}>
                    <span className="w-12 font-bold text-gray-900">{wait}</span>
                    <span className="w-14 text-gray-500">{time}</span>
                    <span className="font-medium text-[#1a73e8]">Bus {bus}</span>
                </div>
            ))}
        </div>
    );
}

export function ArrivalsDemo() {
    return (
        <div className="flex h-full flex-col bg-[#f8f9fa] text-left">
            <div className="border-b border-gray-200 bg-white px-3.5 pb-2.5 pt-9">
                <div className="text-[13px] font-bold leading-tight text-gray-900">University Dr W @ Riddell Centre (NB)</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">Stop #0270</span>
                    {[3, 4, 22, 30].map(r => <RoutePill key={r} route={r} />)}
                </div>
            </div>
            <div className="flex-1 space-y-2 overflow-hidden p-2.5">
                {ARRIVALS.map((a, i) => (
                    <motion.div key={a.route} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.25 }}>
                        <ArrivalCard {...a} />
                    </motion.div>
                ))}
            </div>
            <div className="flex items-center gap-1.5 border-t border-gray-200 bg-white px-3.5 py-2 text-[10px] text-gray-500">
                <RefreshCw size={10} /> Auto-refreshing every 30s
            </div>
        </div>
    );
}

/* ── Tap any stop: a tap on the map, then the arrivals sliding up ── */
export function StopTapDemo() {
    return (
        <div className="relative h-full w-full overflow-hidden">
            <MapCanvas />
            {/* The tap */}
            <div className="absolute left-[31%] top-[25%] -translate-x-1/2 -translate-y-1/2">
                <motion.span
                    className="block h-10 w-10 rounded-full bg-[#1a73e8]/40"
                    animate={{ scale: [0.3, 1.6], opacity: [0.9, 0] }}
                    transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
                />
            </div>
            {/* The sheet it opens */}
            <motion.div
                className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-3.5 text-left shadow-[0_-10px_40px_rgba(0,0,0,0.18)]"
                initial={{ y: '105%' }}
                animate={{ y: ['105%', '0%', '0%', '105%'] }}
                transition={{ duration: 5.5, times: [0, 0.14, 0.9, 1], repeat: Infinity, repeatDelay: 0.6, delay: 0.9, ease: 'easeInOut' }}
            >
                <div className="mx-auto mb-2.5 h-1 w-9 rounded-full bg-gray-300" />
                <div className="mb-2 text-[13px] font-bold text-gray-900">Broad St @ 13th Ave (NB)</div>
                <div className="space-y-2">
                    {ARRIVALS.map(a => <ArrivalCard key={a.route} {...a} rows={a.rows.slice(0, 1)} />)}
                </div>
            </motion.div>
        </div>
    );
}

/* ── Smart route planner: a suggested trip with one transfer ── */
const TRIP = [
    { dot: '#2e7d32', text: <>Walk to <b>Wascana Pkwy @ Kramer Blvd</b> (313 m)</> },
    { dot: ROUTE[3], text: <>Board <b style={{ color: ROUTE[3] }}>Route 3</b> · 17 stops</> },
    { dot: '#e53935', text: <>Get off at <b>Broad St @ 13th Ave</b></> },
    { dot: '#f59e0b', text: <>Transfer · <b style={{ color: ROUTE[50] }}>Route 50</b> in ~9 min</> },
    { dot: ROUTE[50], text: <>Board <b style={{ color: ROUTE[50] }}>Route 50</b> · 19 stops</> },
    { dot: '#1a73e8', text: <>Walk to your destination · <b className="text-[#1a73e8]">11:32 AM</b></> },
];

export function PlannerDemo() {
    return (
        <div className="flex h-full flex-col bg-[#f8f9fa] text-left">
            <div className="border-b border-gray-200 bg-white px-3.5 pb-2.5 pt-9">
                <div className="text-[13px] font-bold text-gray-900">Bus Suggestions</div>
                <div className="truncate text-[10px] text-gray-500">To: Walmart Supercentre, Prince of Wales Drive</div>
            </div>
            <div className="flex-1 space-y-2 overflow-hidden p-2.5">
                <div className="rounded-xl border border-gray-200 bg-white p-2.5" style={{ borderLeft: `4px solid ${ROUTE[3]}` }}>
                    <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        <Star size={9} fill="currentColor" /> Recommended
                    </span>
                    <div className="mb-2 flex items-center gap-1.5">
                        <RoutePill route={3} label="Route 3" />
                        <RoutePill route={50} label="Route 50" />
                        <span className="ml-auto text-sm font-bold text-gray-900">~32 min</span>
                    </div>
                    <div className="mb-2 flex items-center gap-1.5 rounded-md bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700">
                        <Footprints size={11} /> Bus arriving now · Bus #658
                    </div>
                    <div className="relative space-y-1.5 pl-1">
                        <div className="absolute bottom-2 left-[7px] top-2 w-px bg-gray-300" />
                        {TRIP.map((step, i) => (
                            <motion.div
                                key={i}
                                className="relative flex items-center gap-2 py-0.5 text-[11.5px] leading-snug text-gray-700"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + i * 0.45 }}
                            >
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 bg-white" style={{ borderColor: step.dot }} />
                                <span>{step.text}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-2.5" style={{ borderLeft: `4px solid ${ROUTE[21]}` }}>
                    <div className="flex items-center gap-1.5">
                        <RoutePill route={21} label="Route 21" />
                        <RoutePill route={7} label="Route 7" />
                        <span className="ml-auto text-sm font-bold text-gray-900">~40 min</span>
                    </div>
                    <div className="mt-2 rounded-md bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700">
                        Next bus in ~17 min · Bus #682
                    </div>
                    <div className="mt-2 space-y-1.5 pl-1 text-[11px] text-gray-700">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 bg-white" style={{ borderColor: '#2e7d32' }} />
                            <span>Walk to <b>Wascana Pkwy @ Kramer Blvd</b></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 bg-white" style={{ borderColor: ROUTE[21] }} />
                            <span>Board <b style={{ color: ROUTE[21] }}>Route 21</b></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
