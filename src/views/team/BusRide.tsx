/* The bus ride: a person's work shown as one continuous shot through a real 3D scene.

   The scene (busScene.ts, three.js) stays pinned while the reader scrolls a tall section. The camera
   starts outside a bus driving through the city at night, comes round to the front door, steps in
   beside the driver, then turns and walks down the aisle to the back. Each seat carries a lit display
   for one thing the person built or one place they worked; the cards under the scene describe the
   row the camera has reached. The driver is the person, and links to their LinkedIn.

   The 3D code is loaded only when this section is on a page, and if the browser cannot draw 3D
   the same content is shown as a plain list. */
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { ArrowUpRight, ChevronsDown, LinkedinIcon } from 'lucide-react';
import type { CharacterTheme } from '../../models/data/characterThemes';
import type { TeamMember } from '../../models/data/team';
import type { createBusScene } from './busScene';

export interface RideItem {
    title: string;
    sub?: string;
    detail?: string;
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

/* What one seat's display stands for */
function SeatCard({ item, kicker, theme }: { item: RideItem; kicker: string; theme: CharacterTheme }) {
    return (
        <div className="rounded-2xl bg-white/95 backdrop-blur border px-5 py-4 sm:px-6 sm:py-5 shadow-[0_18px_50px_rgba(0,0,0,0.45)] text-left" style={{ borderColor: theme.border }}>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: theme.primary }}>{kicker}</p>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">{item.title}</h3>
                    {item.sub && <p className="text-sm font-semibold text-slate-500">{item.sub}</p>}
                </div>
                {item.stat && (
                    <div className="shrink-0 text-right max-w-[42%]">
                        <div className="text-3xl font-black leading-none" style={{ color: theme.primary }}>{item.stat.value}</div>
                        <div className="text-[11px] font-semibold text-slate-500 mt-1 leading-tight">{item.stat.label}</div>
                    </div>
                )}
            </div>
            {item.detail && <p className="text-sm sm:text-base text-slate-600 leading-relaxed mt-2">{item.detail}</p>}
            {(item.tags || item.link) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {item.tags?.map(tag => (
                        <span key={tag} className="rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: theme.primarySoft, color: theme.primaryDark }}>{tag}</span>
                    ))}
                    {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-sm font-bold no-underline hover:underline" style={{ color: theme.primary }}>
                            {item.linkLabel || 'View on GitHub'} <ArrowUpRight size={16} />
                        </a>
                    )}
                </div>
            )}
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
            <div className="sticky top-0 h-screen overflow-hidden bg-[#060a15]">
                <canvas ref={canvasRef} onClick={onCanvasClick} className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} />
                {/* Darker edges, like a lens */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />

                {/* Opening title, gone once the reader starts scrolling */}
                <AnimatePresence>
                    {!started && (
                        <motion.div className="absolute inset-x-0 top-[12%] px-6 text-center pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                            <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-400 mb-3">{firstName}'s route</p>
                            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 drop-shadow-lg">Everything I've built is on this bus</h2>
                            <p className="flex items-center justify-center gap-2 text-lg text-white/75">
                                Scroll to get on <ChevronsDown size={20} className="animate-bounce text-amber-400" />
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* In the cab: who is driving */}
                <AnimatePresence>
                    {stage === 'driver' && (
                        <motion.a
                            href={person.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute left-1/2 bottom-[9%] w-[min(92vw,460px)] rounded-2xl bg-white/95 backdrop-blur px-6 py-5 no-underline shadow-[0_18px_50px_rgba(0,0,0,0.5)] border"
                            style={{ x: '-50%', borderColor: theme.border }}
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
                    {stage === 'aisle' && (
                        <motion.div className="absolute inset-0 flex flex-col justify-between pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                            <div className="flex flex-wrap items-center justify-center gap-2 px-3 pt-4 pointer-events-auto">
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

                            <div className="px-3 sm:px-6 pb-4 sm:pb-6 max-h-[46%] overflow-y-auto pointer-events-auto">
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
                                            ? <SeatCard key={item.title} item={item} kicker={`${here.zone.label} · seat ${String(row * 2 + k + 1).padStart(2, '0')}`} theme={theme} />
                                            : <div key={k} className="hidden md:block" />)}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
