/* The bus ride: a person's work shown as one continuous shot through a real 3D scene.

   The scene (busScene.ts, three.js) stays pinned while the reader scrolls a tall section. A rider
   waits at a snowy stop, the bus pulls in, they board and the driver waves, then the camera becomes
   the rider's eyes and walks down the aisle to the back. Each seat carries a lit display
   for one thing the person built or one place they worked; the cards under the scene describe the
   row the camera has reached. The driver is the person, and links to their LinkedIn.

   The 3D code is loaded only when this section is on a page, and if the browser cannot draw 3D
   the same content is shown as a plain list. */
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { ArrowUpRight, ChevronsDown, Gamepad2, LinkedinIcon, List, X } from 'lucide-react';
import type { CharacterTheme } from '../../models/data/characterThemes';
import type { SkillArea, TeamMember } from '../../models/data/team';
import type { createBusScene } from './busScene';
import BusGame, { type Passenger } from './BusGame';

export interface RideItem {
    title: string;
    sub?: string;
    detail?: string;
    /** One line that sells it */
    hook?: string;
    /** For hiring managers: the problem, what the person did, how it works */
    problem?: string;
    did?: string;
    how?: string;
    /** The hardest part, and how it was solved */
    challenge?: string;
    areas?: SkillArea[];
    tags?: string[];
    stat?: { value: string; label: string };
    link?: string;
    linkLabel?: string;
}

export interface RideZone {
    /** Part of the bus, e.g. "What I built" */
    label: string;
    icon: React.FC<{ size?: number }>;
    items: RideItem[];
}

/* How much scrolling each part gets, in screen heights */
const APPROACH = 3.6, PER_ROW = 0.75;

/* What one passenger says: a manga speech bubble (thick ink border, offset shadow, a tail pointing up
   at the passenger). Laid out in the order people skim a project: what it is, the result, what it is
   built with, then where to see it. */
function SeatCard({ item, kicker, seat, theme, tail }: { item: RideItem; kicker: string; seat?: string; theme: CharacterTheme; tail?: 'left' | 'right' }) {
    const label = 'block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1';
    return (
        <div className="relative rounded-[26px] bg-white border-[3px] border-slate-900 shadow-[5px_5px_0_#0f172a] px-5 py-4 sm:px-6 text-left">
            {tail && <span className={`absolute -top-[15px] ${tail === 'left' ? 'left-12' : 'right-12'} w-6 h-6 bg-white border-t-[3px] border-l-[3px] border-slate-900 rotate-45`} />}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {seat && <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider text-white" style={{ background: theme.primary }}>SEAT {seat}</span>}
                <span className="text-[10.5px] font-black uppercase tracking-[0.16em]" style={{ color: theme.primary }}>{kicker}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">{item.title}</h3>
            {item.sub && <p className="text-sm font-bold text-slate-500">{item.sub}</p>}
            {item.hook && <p className="mt-1.5 text-base sm:text-lg font-black leading-snug" style={{ color: theme.primaryDark }}>{item.hook}</p>}
            <div className="mt-2.5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2.5">
                    {item.problem && (
                        <div>
                            <span className={label}>The problem</span>
                            <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed">{item.problem}</p>
                        </div>
                    )}
                    {(item.did || item.detail) && (
                        <div>
                            <span className={label}>{item.did ? 'What was done' : 'What it is'}</span>
                            <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed">{item.did ?? item.detail}</p>
                        </div>
                    )}
                    {item.how && (
                        <div>
                            <span className={label}>How it works</span>
                            <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed">{item.how}</p>
                        </div>
                    )}
                    {item.challenge && (
                        <div className="rounded-xl border-2 border-dashed border-slate-300 px-3 py-2">
                            <span className={label}>The hardest part</span>
                            <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed">{item.challenge}</p>
                        </div>
                    )}
                </div>
                {item.stat && (
                    <div className="sm:w-32 rounded-2xl border-2 border-slate-900 px-3 py-2 self-start" style={{ background: theme.primarySoft }}>
                        <span className={label}>Result</span>
                        <div className="text-2xl font-black leading-none" style={{ color: theme.primaryDark }}>{item.stat.value}</div>
                        <div className="text-[11px] font-bold text-slate-600 mt-1 leading-tight">{item.stat.label}</div>
                    </div>
                )}
            </div>
            {(item.tags || item.link) && (
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                    {item.tags && (
                        <div>
                            <span className={label}>Built with</span>
                            <div className="flex flex-wrap gap-1.5">
                                {item.tags.map(tag => (
                                    <span key={tag} className="rounded-full border-2 border-slate-900 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-800">{tag}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border-2 border-slate-900 px-3 py-1 text-sm font-black text-white no-underline shadow-[2px_2px_0_#0f172a] hover:translate-y-px" style={{ background: theme.primary }}>
                            {item.linkLabel || 'View on GitHub'} <ArrowUpRight size={15} />
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}

/* The scroll tour's card: short enough never to need its own scroll bar. The full story opens in a
   panel of its own. */
function CompactCard({ item, kicker, seat, theme, tail, onOpen }: { item: RideItem; kicker: string; seat: string; theme: CharacterTheme; tail: 'left' | 'right'; onOpen: () => void }) {
    return (
        <div className="relative rounded-[24px] bg-white border-[3px] border-slate-900 shadow-[5px_5px_0_#0f172a] px-4 py-3 sm:px-5 sm:py-4 text-left">
            <span className={`absolute -top-[15px] ${tail === 'left' ? 'left-12' : 'right-12'} w-6 h-6 bg-white border-t-[3px] border-l-[3px] border-slate-900 rotate-45`} />
            <div className="flex items-center gap-2 mb-1">
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider text-white" style={{ background: theme.primary }}>SEAT {seat}</span>
                <span className="truncate text-[10.5px] font-black uppercase tracking-[0.14em]" style={{ color: theme.primary }}>{kicker}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-base sm:text-xl font-black text-slate-900 leading-tight">{item.title}</h3>
                    {(item.hook || item.sub) && <p className="mt-0.5 text-sm sm:text-base font-bold leading-snug line-clamp-2" style={{ color: theme.primaryDark }}>{item.hook || item.sub}</p>}
                </div>
                {item.stat && (
                    <div className="shrink-0 text-right max-w-[38%]">
                        <div className="text-xl sm:text-2xl font-black leading-none" style={{ color: theme.primary }}>{item.stat.value}</div>
                        <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 mt-0.5 leading-tight line-clamp-2">{item.stat.label}</div>
                    </div>
                )}
            </div>
            <button onClick={onOpen} className="mt-2 inline-flex items-center gap-1 rounded-full border-2 border-slate-900 px-3 py-1 text-xs sm:text-sm font-black text-slate-900 hover:bg-amber-100">
                Read the full story <ArrowUpRight size={14} />
            </button>
        </div>
    );
}

export default function BusRide({ person, theme, zones }: { person: TeamMember; theme: CharacterTheme; zones: RideZone[] }) {
    const firstName = person.name.split(' ')[0];

    /* Two seats to a row; each part of the bus starts on a fresh row */
    const rows = zones.flatMap((zone, z) =>
        Array.from({ length: Math.ceil(zone.items.length / 2) }, (_, i) => ({ zone, z, first: i === 0, pair: [zone.items[i * 2], zone.items[i * 2 + 1]] as (RideItem | undefined)[] })));
    const last = rows.length - 1;
    const total = APPROACH + rows.length * PER_ROW;
    const aisleStart = APPROACH / total;

    const sectionRef = useRef<HTMLElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scene = useRef<ReturnType<typeof createBusScene> | null>(null);
    const [ready, setReady] = useState(false);
    const [unsupported, setUnsupported] = useState(false);
    /* Where the camera is: 'outside', 'driver' (in the cab), or 'aisle' */
    const [stage, setStage] = useState<'outside' | 'driver' | 'aisle'>('outside');
    const [row, setRow] = useState(0);
    const [started, setStarted] = useState(false);
    /* Game mode (walk the bus yourself) and the plain list, for anyone short on time */
    const [playing, setPlaying] = useState(false);
    const [listOpen, setListOpen] = useState(false);
    /* One item's full story, opened from the scroll tour */
    const [story, setStory] = useState<{ item: RideItem; kicker: string; seat: string } | null>(null);
    /* Everyone on board, in seat order: the same order the scene seats them */
    const people: Passenger[] = rows.flatMap((r, ri) => r.pair.flatMap((item, k) => (item ? [{ item, zone: r.zone.label, seat: ri * 2 + k + 1 }] : [])));

    useEffect(() => {
        let cancelled = false;
        const canvas = canvasRef.current;
        if (!canvas) return;
        import('./busScene')
            .then(({ createBusScene: create }) => {
                if (cancelled) return;
                scene.current = create(canvas, {
                    rows: rows.map(r => ({ seats: r.pair.map(item => item?.title), zone: r.first ? r.zone.label : undefined, kicker: r.zone.label })),
                    color: theme.primary,
                    colorDark: theme.primaryDark,
                    sign: `${firstName.toUpperCase()}'S ROUTE`,
                    operator: person.name,
                    operatorRole: `${person.title} · ${person.focus}`,
                    adverts: person.skills,
                    aisleStart,
                });
                setReady(true);
            })
            .catch(() => setUnsupported(true));
        return () => { cancelled = true; scene.current?.dispose(); scene.current = null; };
        // The scene is built once for this person; their data does not change while the page is open
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [person.slug]);

    const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
    useMotionValueEvent(scrollYProgress, 'change', p => {
        scene.current?.setProgress(p);
        setStarted(p > 0.015);
        const next = p >= aisleStart ? 'aisle' : p > aisleStart * 0.62 ? 'driver' : 'outside';
        setStage(next);
        const at = next === 'aisle' ? Math.round(((p - aisleStart) / (1 - aisleStart)) * last) : -1;
        scene.current?.setActiveRow(at);
        if (at >= 0) setRow(at);
    });

    const scrollToShare = (share: number) => {
        const section = sectionRef.current;
        if (section) window.scrollTo({ top: section.offsetTop + (section.offsetHeight - window.innerHeight) * share, behavior: 'smooth' });
    };
    const walkTo = (target: number) => scrollToShare(aisleStart + (1 - aisleStart) * (last ? target / last : 0) + 0.002);

    const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const box = e.currentTarget.getBoundingClientRect();
        const hit = scene.current?.pick(e.clientX - box.left, e.clientY - box.top);
        if (hit?.kind === 'row') walkTo(hit.row);
        if (hit?.kind === 'driver') window.open(person.linkedin, '_blank', 'noopener');
    };

    /* No 3D available: the same content, as a list */
    if (unsupported) {
        return (
            <section className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10" style={{ zIndex: 1 }}>
                {zones.map(zone => (
                    <div key={zone.label} className="mb-10">
                        <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-5">{zone.label}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {zone.items.map(item => <SeatCard key={item.title} item={item} kicker={zone.label} theme={theme} />)}
                        </div>
                    </div>
                ))}
            </section>
        );
    }

    const here = rows[row];
    const pill = 'flex items-center gap-2 rounded-full border px-3 py-1 text-xs sm:text-sm font-bold backdrop-blur transition-colors';

    return (
        <section ref={sectionRef} className="relative" style={{ height: `${(1 + total) * 100}vh` }}>
            <div className={`${playing ? 'fixed inset-0 z-[80] h-[100dvh]' : 'sticky top-0 h-screen'} overflow-hidden bg-[#060a15]`} style={playing ? { overscrollBehavior: 'none' } : undefined}>
                <canvas ref={canvasRef} onClick={onCanvasClick} className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} />
                {/* Darker edges, like a lens */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />

                {playing && scene.current && (
                    <BusGame scene={scene.current} people={people} person={person} theme={theme} onExit={() => setPlaying(false)} onList={() => setListOpen(true)} />
                )}

                {/* Opening title, gone once the reader starts scrolling */}
                <AnimatePresence>
                    {!started && !playing && (
                        <motion.div className="absolute inset-x-0 bottom-[7%] px-6 text-center pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                            <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-400 mb-3">{firstName}'s route</p>
                            <h2 className="text-3xl sm:text-5xl font-black text-white mb-2 drop-shadow-[0_4px_18px_rgba(0,0,0,0.8)]">Everything I've built is on this bus</h2>
                            <p className="text-base sm:text-lg text-white/80 mb-4 drop-shadow">It's 4 minutes away and {firstName} is driving. Every passenger is something we built: say hi.</p>
                            <div className="flex flex-wrap items-center justify-center gap-3 mb-4 pointer-events-auto">
                                <button onClick={() => setPlaying(true)} disabled={!ready} className="inline-flex items-center gap-2 rounded-full border-[3px] border-slate-900 bg-amber-400 px-5 py-2.5 text-base font-black text-slate-900 shadow-[4px_4px_0_#0f172a] hover:-translate-y-0.5 transition-transform disabled:opacity-60">
                                    <Gamepad2 size={20} /> Play: meet everyone on board
                                </button>
                                <button onClick={() => setListOpen(true)} className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 bg-black/40 px-4 py-2 text-sm font-bold text-white backdrop-blur hover:bg-black/60">
                                    <List size={16} /> Short on time? See it all as a list
                                </button>
                            </div>
                            <p className="flex items-center justify-center gap-2 text-lg text-white/75">
                                or scroll to ride along <ChevronsDown size={20} className="animate-bounce text-amber-400" />
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* In the cab: who is driving */}
                <AnimatePresence>
                    {stage === 'driver' && !playing && (
                        <motion.a
                            href={person.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute left-1/2 sm:left-[4%] bottom-[9%] sm:bottom-[13%] w-[min(92vw,460px)] rounded-[26px] bg-white px-6 py-5 no-underline border-[3px] border-slate-900 shadow-[5px_5px_0_#0f172a]"
                            style={{ x: typeof window !== 'undefined' && window.innerWidth >= 640 ? 0 : '-50%' }}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 24 }}
                            transition={{ duration: 0.35 }}
                        >
                            <span className="block text-[11px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: theme.primary }}>At the wheel</span>
                            <span className="block text-2xl font-black text-slate-900 leading-tight">{person.name}</span>
                            <span className="block text-sm font-semibold text-slate-500 mb-3">{person.title} of Transit Regina · {person.focus}</span>
                            <span className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-white" style={{ background: theme.primary }}>
                                <LinkedinIcon size={17} /> Connect on LinkedIn
                            </span>
                        </motion.a>
                    )}
                </AnimatePresence>

                {/* In the aisle: where we are, and the two seats in front of the camera */}
                <AnimatePresence>
                    {stage === 'aisle' && !playing && (
                        <motion.div className="absolute inset-0 flex flex-col justify-between pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                            <div className="flex flex-col items-center gap-2.5 px-3 pt-4 pointer-events-auto">
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <button onClick={() => setPlaying(true)} className={pill} style={{ background: '#fbbf24', borderColor: '#0f172a', color: '#0f172a' }}>
                                    <Gamepad2 size={14} /> Explore it yourself
                                </button>
                                <button onClick={() => scrollToShare(aisleStart * 0.8)} className={pill} style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)', color: 'white' }}>
                                    The driver
                                </button>
                                {zones.map((zone, z) => (
                                    <button
                                        key={zone.label}
                                        onClick={() => walkTo(rows.findIndex(r => r.z === z))}
                                        className={pill}
                                        style={here.z === z ? { background: '#fbbf24', borderColor: '#fbbf24', color: '#0f172a' } : { background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)', color: 'white' }}
                                    >
                                        <zone.icon size={14} /> {zone.label}
                                    </button>
                                ))}
                            </div>
                            {/* The route so far: one stop per row of seats */}
                            <div className="flex items-center w-full max-w-md" aria-label={`Stop ${row + 1} of ${rows.length}`}>
                                {rows.map((_, i) => (
                                    <React.Fragment key={i}>
                                        {i > 0 && <span className={`h-0.5 flex-1 ${i <= row ? 'bg-amber-400' : 'bg-white/20'}`} />}
                                        <button
                                            onClick={() => walkTo(i)}
                                            aria-label={`Go to stop ${i + 1}`}
                                            className={`shrink-0 rounded-full transition-all ${i === row ? 'w-3.5 h-3.5 bg-amber-400 ring-4 ring-amber-400/30' : i < row ? 'w-2 h-2 bg-amber-400' : 'w-2 h-2 border border-white/50 bg-black/30'}`}
                                        />
                                    </React.Fragment>
                                ))}
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Stop {row + 1} of {rows.length}</span>
                            </div>

                            <div className="px-3 sm:px-6 pb-4 sm:pb-6 pointer-events-auto">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={row}
                                        className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-end"
                                        initial={{ opacity: 0, y: 18 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        transition={{ duration: 0.22 }}
                                    >
                                        {here.pair.map((item, k) => item
                                            ? <CompactCard key={item.title} item={item} kicker={here.zone.label} seat={String(row * 2 + k + 1).padStart(2, '0')} theme={theme} tail={k ? 'right' : 'left'} onOpen={() => setStory({ item, kicker: here.zone.label, seat: String(row * 2 + k + 1).padStart(2, '0') })} />
                                            : <div key={k} className="hidden md:block" />)}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* One full story, from the scroll tour */}
            <AnimatePresence>
                {story && (
                    <motion.div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setStory(null)}>
                        <motion.div className="relative w-full max-w-2xl max-h-[88dvh] overflow-y-auto rounded-[26px]" initial={{ y: 40, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 40 }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => setStory(null)} aria-label="Close" className="absolute right-3 top-3 z-10 rounded-full border-2 border-slate-900 bg-white p-1.5 text-slate-900"><X size={18} /></button>
                            <SeatCard item={story.item} kicker={story.kicker} seat={story.seat} theme={theme} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Everything on the bus as a plain list */}
            <AnimatePresence>
                {listOpen && (
                    <motion.div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-3 sm:p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setListOpen(false)}>
                        <div className="mx-auto max-w-5xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-2xl sm:text-4xl font-black text-white">Everything on {firstName}'s bus</h2>
                                <button onClick={() => setListOpen(false)} aria-label="Close the list" className="rounded-full bg-white p-2 text-slate-900"><X size={20} /></button>
                            </div>
                            {zones.map(zone => (
                                <div key={zone.label} className="mb-8">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-amber-400 mb-3">{zone.label}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {zone.items.map(item => <SeatCard key={item.title} item={item} kicker={zone.label} theme={theme} />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
