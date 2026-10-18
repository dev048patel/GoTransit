/* Game mode for the bus ride: walk the bus yourself and meet everyone on it.

   Built on how exploration games and the best-known 3D portfolios handle this:
   - Move with the arrow keys or WASD, or click/tap anywhere to walk there (tap-to-move suits casual
     exploring on phones better than a bolted-on joystick; a small d-pad is there too).
   - Everyone you have not met carries a "!" marker you can see from a distance; walking close shows
     their name and an "E" prompt. Every prompt works by key and by click.
   - Conversations use a bottom-of-screen dialogue box with high contrast. Text types out at about
     30 ms a letter with short pauses at punctuation; the first press finishes the line, the next
     moves on, and a marker shows when there is more.
   - A "Found X of N" counter, a journal of everyone on board (with "take me there" for anyone not
     yet met), and a minimap keep progress visible at a glance.
   - Recruiters spend minutes, not hours: "See it all as a list" is always one click away.
   - Small rewards keep it moving: a toast for each new person met, a hint pointing to the nearest
     one you have not met, running (Shift), a hop (Space), and dragging to look around. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, BookOpen, Check, Compass, GithubIcon, LinkedinIcon, List, Mail, Sparkles, X } from 'lucide-react';
import type { CharacterTheme } from '../../models/data/characterThemes';
import type { TeamMember } from '../../models/data/team';
import { useRideDiscoveries } from '../../controllers/useRideDiscoveries';
import type { createBusScene, GameState, Talker } from './busScene';
import type { RideItem } from './BusRide';

export interface Passenger { item: RideItem; zone: string; seat: number }
type Scene = ReturnType<typeof createBusScene>;
type Page = { kind: 'say'; text: string } | { kind: 'card' };

const DRIVER_ID = '__driver';
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const CHAR_MS = 30, PAUSE_MS = 220;
const key = (label: string) => <kbd className="inline-flex min-w-[1.6rem] justify-center rounded-md border-2 border-slate-900 bg-white px-1.5 text-xs font-black text-slate-900 shadow-[0_2px_0_#0f172a]">{label}</kbd>;

export default function BusGame({ scene, people, person, theme, onExit, onList }: {
    scene: Scene; people: Passenger[]; person: TeamMember; theme: CharacterTheme; onExit: () => void; onList: () => void;
}) {
    const firstName = person.name.split(' ')[0];
    const { met, meet } = useRideDiscoveries(person.slug);
    const [game, setGame] = useState<GameState | null>(null);
    const [talk, setTalk] = useState<Talker | null>(null);
    const [page, setPage] = useState(0);
    const [shown, setShown] = useState(0);
    const [journal, setJournal] = useState(false);
    const [help, setHelp] = useState(() => { try { return !localStorage.getItem('ride-help-seen'); } catch { return true; } });
    const pending = useRef<Talker | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const touch = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches, []);

    const total = people.length + 1;
    const found = people.filter(p => met.has(p.item.title)).length + (met.has(DRIVER_ID) ? 1 : 0);
    /* Returning visitors who already met everyone are not congratulated again */
    const [celebrated, setCelebrated] = useState(() => found === total);
    const nameOf = (t: Talker) => (t === 'driver' ? `${firstName}, the driver` : people[t].item.title);

    /* Pages of a conversation: what they say (typed out), then a card with the result, tools and link */
    const pages: Page[] = useMemo(() => {
        if (talk === null) return [];
        if (talk === 'driver') return [{ kind: 'say', text: `Hey, welcome aboard! I'm ${firstName}. ${person.pitch}` }, { kind: 'card' }];
        const { item } = people[talk];
        const said: Page = { kind: 'say', text: item.detail || item.sub || item.title };
        return item.stat || item.tags?.length || item.link ? [said, { kind: 'card' }] : [said];
    }, [talk, people, person.pitch, firstName]);
    const current = pages[page];
    const text = current?.kind === 'say' ? current.text : '';
    const typing = current?.kind === 'say' && shown < text.length;

    /* Into game mode, and back out */
    useEffect(() => {
        scene.setExploring(true);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { scene.setExploring(false); document.body.style.overflow = overflow; };
    }, [scene]);

    useEffect(() => {
        scene.setMet(people.map((p, i) => (met.has(p.item.title) ? i : -1)).filter(i => i >= 0), met.has(DRIVER_ID));
    }, [scene, people, met]);

    const startTalk = useCallback((t: Talker) => {
        pending.current = null;
        scene.setTalking(t);
        setTalk(t); setPage(0); setShown(0); setJournal(false);
        const id = t === 'driver' ? DRIVER_ID : people[t].item.title;
        if (!met.has(id)) {
            setToast(t === 'driver' ? `${firstName}, the driver` : people[t].item.title);
            try { navigator.vibrate?.(18); } catch { /* not supported */ }
        }
        meet(id);
    }, [scene, meet, people, met, firstName]);
    useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 2600); return () => clearTimeout(id); }, [toast]);

    const endTalk = useCallback(() => {
        scene.setTalking(null);
        scene.setMouth(false);
        setTalk(null);
    }, [scene]);

    /* First press finishes the line; the next moves on; after the last page, the talk ends */
    const advance = useCallback(() => {
        if (typing) { setShown(text.length); return; }
        if (page < pages.length - 1) { setPage(p => p + 1); setShown(0); return; }
        endTalk();
    }, [typing, text.length, page, pages.length, endTalk]);

    /* Typewriter, with the speaker's mouth moving while it types */
    useEffect(() => {
        scene.setMouth(typing);
        if (!typing) return;
        const ch = text[shown - 1];
        const id = setTimeout(() => setShown(n => n + 1), ch && '.!?,:'.includes(ch) ? PAUSE_MS : CHAR_MS);
        return () => clearTimeout(id);
    }, [scene, typing, shown, text]);

    /* Read the scene ten times a second: position for the minimap, who is in reach, arrivals */
    useEffect(() => {
        const id = setInterval(() => {
            const s = scene.state();
            setGame(s);
            if (pending.current !== null && s.near === pending.current && scene.isNearTarget()) startTalk(pending.current);
        }, 100);
        return () => clearInterval(id);
    }, [scene, startTalk]);

    const goTo = useCallback((t: Talker) => { pending.current = t; scene.walkTo(t); setJournal(false); }, [scene]);

    /* Keyboard: arrows/WASD to walk, E/Enter/Space to talk or continue, J for the journal, Esc to back out */
    const held = useRef(new Set<string>());
    useEffect(() => {
        const steer = () => {
            const h = held.current;
            const x = (h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0), z = (h.has('down') ? 1 : 0) - (h.has('up') ? 1 : 0);
            if (x || z) pending.current = null;
            scene.setInput(x, z);
        };
        const dir: Record<string, string> = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
        const down = (e: KeyboardEvent) => {
            if (dir[e.code]) { e.preventDefault(); held.current.add(dir[e.code]); steer(); return; }
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { scene.setRun(true); return; }
            if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
                e.preventDefault();
                if (e.repeat) return;
                if (help) { setHelp(false); return; }
                if (talk !== null) advance();
                else if (game?.near != null && e.code !== 'Space') startTalk(game.near);
                else if (e.code === 'Space') { if (game?.near != null) startTalk(game.near); else scene.jump(); }
            } else if (e.code === 'KeyC') scene.resetCamera();
            else if (e.code === 'KeyJ') setJournal(j => !j);
            else if (e.code === 'Escape') {
                if (talk !== null) endTalk(); else if (journal) setJournal(false); else onExit();
            }
        };
        const up = (e: KeyboardEvent) => {
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') scene.setRun(false);
            if (dir[e.code]) { held.current.delete(dir[e.code]); steer(); }
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    }, [scene, talk, game?.near, advance, startTalk, endTalk, journal, onExit, help]);
    /* Stop walking when the game closes (not each time the key handler is refreshed) */
    useEffect(() => () => { held.current.clear(); scene.setInput(0, 0); }, [scene]);

    /* Click or tap in the scene: a person to walk up to and talk with, or a spot to walk to */
    /* Telling a click from a drag: a click is short or barely moves (fast hands wobble), a drag is
       a deliberate sweep. Turning follows the mouse but each event is capped, so a flick of the
       wrist cannot spin the camera round. */
    const drag = useRef<{ x: number; startX: number; startY: number; at: number; turning: boolean } | null>(null);
    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, startX: e.clientX, startY: e.clientY, at: performance.now(), turning: false };
    };
    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        d.x = e.clientX;
        if (!d.turning && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 14) d.turning = true;
        if (d.turning) scene.turnCamera(-clamp(dx, -30, 30) * 0.005);
    };
    const endDrag = () => { drag.current = null; };
    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        const quick = performance.now() - d.at < 220 && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 40;
        if (d.turning && !quick) return;   // that was looking around, not a click
        if (talk !== null) { advance(); return; }
        const box = e.currentTarget.getBoundingClientRect();
        const hit = scene.pickGame(e.clientX - box.left, e.clientY - box.top);
        if (!hit) return;
        if (hit.kind === 'floor') { pending.current = null; scene.walkToFloor(hit.x, hit.z); }
        else goTo(hit.kind === 'driver' ? 'driver' : hit.index);
    };
    /* The nearest person not yet met, for the hint under the counter */
    const nextNew = useMemo(() => {
        if (!game) return null;
        let best: { t: Talker; d: number } | null = null;
        game.passengers.forEach((p, i) => {
            if (met.has(people[i].item.title)) return;
            const d = Math.hypot(p.x - game.x, p.z - game.z);
            if (!best || d < best.d) best = { t: i, d };
        });
        if (!met.has(DRIVER_ID)) {
            const d = Math.hypot(game.driver.x - game.x, game.driver.z - game.z);
            if (!best || d < (best as { d: number }).d) best = { t: 'driver', d };
        }
        return best as { t: Talker; d: number } | null;
    }, [game, met, people]);

    const pad = (name: string, x: number, z: number, icon: React.ReactNode) => (
        <button
            aria-label={name}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-white/90 text-slate-900 shadow-[0_3px_0_#0f172a] active:translate-y-0.5 active:bg-amber-300"
            style={{ touchAction: 'none' }}
            onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); pending.current = null; scene.setInput(x, z); }}
            onPointerUp={() => scene.setInput(0, 0)}
            onPointerCancel={() => scene.setInput(0, 0)}
            onContextMenu={e => e.preventDefault()}
        >{icon}</button>
    );

    const complete = found === total;
    const hud = 'rounded-2xl border-2 border-slate-900 bg-white/95 shadow-[3px_3px_0_#0f172a]';

    return (
        <div className="absolute inset-0 z-20 select-none">
            {/* the scene takes clicks and taps */}
            <div className="absolute inset-0 cursor-grab active:cursor-grabbing" style={{ touchAction: 'none' }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={endDrag} onLostPointerCapture={endDrag} />

            {/* A quick fade in, like a scene cut */}
            <motion.div className="absolute inset-0 bg-black pointer-events-none" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }} />

            {/* Progress */}
            <div className={`absolute left-3 top-3 sm:left-5 sm:top-5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[56vw] ${hud}`}>
                <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: theme.primary }}>{firstName}'s bus</span>
                    <span className="text-sm font-black text-slate-900">Met {found} of {total}</span>
                </div>
                <div className="mt-1.5 h-2 w-32 sm:w-44 overflow-hidden rounded-full bg-slate-200">
                    <motion.div className="h-full rounded-full" style={{ background: theme.primary }} animate={{ width: `${(found / total) * 100}%` }} />
                </div>
                {nextNew && talk === null && (
                    <button onClick={() => goTo(nextNew.t)} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900">
                        <Compass size={14} style={{ color: theme.primary }} />
                        Nearest new: {nextNew.t === 'driver' ? 'the driver' : `seat ${String(people[nextNew.t].seat).padStart(2, '0')}`} · {nextNew.d < 1.2 ? 'right here' : `${Math.round(nextNew.d)} m`}
                    </button>
                )}
            </div>

            {/* New in the journal */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        className={`absolute left-1/2 top-28 sm:top-20 flex max-w-[92vw] items-center gap-2 px-4 py-2 ${hud}`}
                        initial={{ opacity: 0, y: -16, x: '-50%', scale: 0.9 }} animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }} exit={{ opacity: 0, y: -10, x: '-50%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    >
                        <Sparkles size={18} style={{ color: theme.primary }} />
                        <span className="truncate text-sm font-black text-slate-900">New in your journal: {toast}</span>
                        <span className="text-xs font-black text-slate-400">{found}/{total}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Journal, list, exit */}
            <div className="absolute right-3 top-3 sm:right-5 sm:top-5 flex gap-2">
                <button onClick={() => setJournal(j => !j)} aria-label="Journal" className={`flex items-center gap-1.5 px-3 py-2 text-sm font-black text-slate-900 ${hud}`}><BookOpen size={16} /> <span className="hidden sm:inline">Journal</span> {!touch && key('J')}</button>
                <button onClick={onList} className={`hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-black text-slate-900 ${hud}`}><List size={16} /> List</button>
                <button onClick={onExit} aria-label="Leave game mode" className={`flex items-center gap-1.5 px-3 py-2 text-sm font-black text-slate-900 ${hud}`}><X size={16} /> {!touch && key('Esc')}</button>
            </div>

            {/* Minimap: the bus from above, front at the top */}
            {game && (
                <svg viewBox="-140 0 280 640" className={`absolute right-3 sm:right-5 top-20 hidden sm:block w-[74px] h-[170px] ${hud} !bg-slate-900/80 p-1.5`} aria-label="Map of the bus">
                    {(() => {
                        const Y = (z: number) => 20 + ((game.front - z) / (game.front - game.rear)) * 600, X = (x: number) => x * 100;
                        return (
                            <>
                                <rect x={-125} y={10} width={250} height={620} rx={40} fill="#1e293b" stroke="#94a3b8" strokeWidth={6} />
                                <rect x={-20} y={Y(game.front)} width={40} height={Y(game.rear) - Y(game.front)} fill="#334155" />
                                {game.passengers.map((p, i) => (
                                    <circle key={i} cx={X(p.x)} cy={Y(p.z)} r={22} fill={met.has(people[i].item.title) ? '#5be08f' : '#ffc21a'} stroke="#0f172a" strokeWidth={5} onClick={() => goTo(i)} style={{ cursor: 'pointer' }} />
                                ))}
                                <circle cx={X(game.driver.x)} cy={Y(game.driver.z)} r={24} fill={met.has(DRIVER_ID) ? '#5be08f' : '#ffc21a'} stroke="#0f172a" strokeWidth={5} onClick={() => goTo('driver')} style={{ cursor: 'pointer' }} />
                                <g transform={`translate(${X(game.x)} ${Y(game.z)}) rotate(${(game.heading * 180) / Math.PI})`}>
                                    <path d="M0 -34 L24 22 L0 10 L-24 22 Z" fill="#ffffff" stroke="#0f172a" strokeWidth={5} />
                                </g>
                            </>
                        );
                    })()}
                </svg>
            )}

            {/* "Talk" prompt for whoever is in reach */}
            <AnimatePresence>
                {talk === null && game?.near != null && !journal && (
                    <motion.button
                        key={String(game.near)}
                        onClick={() => startTalk(game.near!)}
                        className={`absolute left-1/2 ${touch ? 'bottom-[188px]' : 'bottom-16'} -translate-x-1/2 flex max-w-[92vw] items-center gap-2.5 px-4 py-2.5 ${hud}`}
                        initial={{ opacity: 0, y: 10, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 10, x: '-50%' }}
                    >
                        {touch ? <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-black text-white">TAP</span> : key('E')}
                        <span className="truncate text-sm sm:text-base font-black text-slate-900">Talk to {nameOf(game.near)}</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Dialogue */}
            <AnimatePresence>
                {talk !== null && current && (
                    <motion.div
                        className="absolute inset-x-3 bottom-3 sm:inset-x-auto sm:left-1/2 sm:w-[min(760px,92vw)] sm:-translate-x-1/2 sm:bottom-6"
                        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
                        onClick={advance}
                    >
                        <div className="relative rounded-[22px] border-[3px] border-slate-900 bg-white px-5 pt-6 pb-4 sm:px-7 shadow-[6px_6px_0_#0f172a] cursor-pointer">
                            <div className="absolute -top-4 left-5 flex items-center gap-2 rounded-full border-[3px] border-slate-900 px-3 py-0.5 text-sm font-black text-white" style={{ background: theme.primary }}>
                                {talk === 'driver' ? `${person.name} · driving` : `Seat ${String(people[talk].seat).padStart(2, '0')} · ${people[talk].zone}`}
                            </div>
                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{talk === 'driver' ? `${person.title} of Transit Regina` : people[talk].item.title}</h3>
                            {talk === 'driver' ? <p className="text-sm font-bold text-slate-500">{person.focus}</p> : people[talk].item.sub && <p className="text-sm font-bold text-slate-500">{people[talk].item.sub}</p>}

                            {current.kind === 'say' ? (
                                <p className="mt-2 min-h-[4.5rem] text-[15px] sm:text-lg leading-relaxed text-slate-800" aria-live="polite">
                                    {text.slice(0, shown)}<span className="invisible">{text.slice(shown)}</span>
                                </p>
                            ) : talk === 'driver' ? (
                                <div className="mt-3 flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
                                    <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 px-4 py-2 font-black text-white no-underline shadow-[2px_2px_0_#0f172a]" style={{ background: theme.primary }}><LinkedinIcon size={16} /> Connect on LinkedIn</a>
                                    <a href={person.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-4 py-2 font-black text-slate-900 no-underline shadow-[2px_2px_0_#0f172a]"><GithubIcon size={16} /> GitHub</a>
                                    {person.email && <a href={`mailto:${person.email}`} className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-4 py-2 font-black text-slate-900 no-underline shadow-[2px_2px_0_#0f172a]"><Mail size={16} /> Email</a>}
                                </div>
                            ) : (() => {
                                const { item } = people[talk];
                                return (
                                    <div className="mt-3 flex flex-wrap items-end gap-4" onClick={e => e.stopPropagation()}>
                                        {item.stat && (
                                            <div className="rounded-2xl border-2 border-slate-900 px-3 py-2" style={{ background: theme.primarySoft }}>
                                                <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Result</span>
                                                <span className="block text-2xl font-black leading-none" style={{ color: theme.primaryDark }}>{item.stat.value}</span>
                                                <span className="block text-xs font-bold text-slate-600">{item.stat.label}</span>
                                            </div>
                                        )}
                                        {item.tags && (
                                            <div className="min-w-0 flex-1">
                                                <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mb-1">Built with</span>
                                                <div className="flex flex-wrap gap-1.5">{item.tags.map(t => <span key={t} className="rounded-full border-2 border-slate-900 bg-white px-2 py-0.5 text-xs font-bold text-slate-800">{t}</span>)}</div>
                                            </div>
                                        )}
                                        {item.link && (
                                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border-2 border-slate-900 px-3 py-1.5 text-sm font-black text-white no-underline shadow-[2px_2px_0_#0f172a]" style={{ background: theme.primary }}>
                                                {item.linkLabel || 'View on GitHub'} <ArrowUpRight size={15} />
                                            </a>
                                        )}
                                    </div>
                                );
                            })()}

                            <div className="mt-2 flex items-center justify-end gap-2 text-xs font-bold text-slate-400">
                                {page + 1} / {pages.length}
                                <motion.span animate={{ y: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 0.9 }} className="text-slate-900">{typing ? '…' : page < pages.length - 1 ? '▼' : '✕'}</motion.span>
                                {!touch && <span>{key('E')} {typing ? 'skip' : page < pages.length - 1 ? 'next' : 'close'}</span>}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Touch d-pad */}
            {touch && talk === null && (
                <div className="absolute left-3 grid grid-cols-3 gap-1.5" style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                    <span />{pad('Walk towards the back', 0, -1, <ArrowUp size={20} />)}<span />
                    {pad('Step left', -1, 0, <ArrowLeft size={20} />)}{pad('Walk towards the front', 0, 1, <ArrowDown size={20} />)}{pad('Step right', 1, 0, <ArrowRight size={20} />)}
                </div>
            )}

            {/* Journal: everyone on board */}
            <AnimatePresence>
                {journal && (
                    <motion.div className="absolute inset-0 flex items-center justify-center bg-black/50 p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setJournal(false)}>
                        <motion.div className={`max-h-[85vh] w-[min(640px,96vw)] overflow-y-auto p-5 sm:p-6 ${hud} !rounded-[24px]`} initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-2xl font-black text-slate-900">Journal</h3>
                                <button onClick={() => setJournal(false)} aria-label="Close the journal" className="rounded-full p-1.5 hover:bg-slate-100"><X size={20} /></button>
                            </div>
                            <p className="text-sm font-bold text-slate-500 mb-4">Met {found} of {total}. Anyone you have not met yet is a "?" until you say hi.</p>
                            {[{ zone: 'At the wheel', list: [{ id: DRIVER_ID, title: `${person.name}`, sub: `${person.title} · ${person.focus}`, go: 'driver' as Talker, seat: 0 }] },
                              ...Array.from(new Set(people.map(p => p.zone))).map(zone => ({ zone, list: people.map((p, i) => ({ p, i })).filter(({ p }) => p.zone === zone).map(({ p, i }) => ({ id: p.item.title, title: p.item.title, sub: p.item.sub, go: i as Talker, seat: p.seat })) }))]
                                .map(group => (
                                    <div key={group.zone} className="mb-4">
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: theme.primary }}>{group.zone}</h4>
                                        <ul className="space-y-1.5">
                                            {group.list.map(entry => {
                                                const known = met.has(entry.id);
                                                return (
                                                    <li key={entry.id} className="flex items-center gap-3 rounded-xl border-2 border-slate-200 px-3 py-2">
                                                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 text-sm font-black ${known ? 'bg-[#5be08f]' : 'bg-[#ffc21a]'}`}>{known ? <Check size={15} /> : '?'}</span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block font-black text-slate-900 leading-tight truncate">{known ? entry.title : '???'}</span>
                                                            <span className="block text-xs font-bold text-slate-500 truncate">{known ? entry.sub : entry.seat ? `Seat ${String(entry.seat).padStart(2, '0')}` : 'Front of the bus'}</span>
                                                        </span>
                                                        <button onClick={() => (known ? startTalk(entry.go) : goTo(entry.go))} className="shrink-0 rounded-full border-2 border-slate-900 px-3 py-1 text-xs font-black text-slate-900 hover:bg-slate-100">
                                                            {known ? 'Talk again' : 'Take me there'}
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ))}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* How to play, the first time */}
            <AnimatePresence>
                {help && (
                    <motion.div className="absolute inset-0 flex items-center justify-center bg-black/55 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className={`w-[min(460px,94vw)] p-6 ${hud} !rounded-[24px]`}>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: theme.primary }}>How to play</p>
                            <h3 className="text-2xl font-black text-slate-900 mb-3">Meet everyone on {firstName}'s bus</h3>
                            <p className="text-slate-600 mb-4">Every passenger with a <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-900 bg-[#ffc21a] text-xs font-black">!</span> is something {firstName} built or a place they worked. Walk up and say hi.</p>
                            <ul className="space-y-2 text-sm font-bold text-slate-800 mb-5">
                                {touch ? (
                                    <>
                                        <li>Tap anyone to walk over and talk</li>
                                        <li>Tap the floor to walk there, or use the arrows</li>
                                        <li>Drag to look around</li>
                                        <li>Tap the dialogue to continue</li>
                                    </>
                                ) : (
                                    <>
                                        <li className="flex items-center gap-2">{key('W')}{key('A')}{key('S')}{key('D')} or arrows to walk · hold {key('Shift')} to run</li>
                                        <li className="flex items-center gap-2">{key('E')} to talk and continue · {key('Space')} to hop</li>
                                        <li className="flex items-center gap-2">Drag to look around · {key('C')} centre the camera</li>
                                        <li className="flex items-center gap-2">Click anyone to walk over · {key('J')} journal · {key('Esc')} leave</li>
                                    </>
                                )}
                            </ul>
                            <button onClick={() => { setHelp(false); try { localStorage.setItem('ride-help-seen', '1'); } catch { /* fine */ } }} className="w-full rounded-full border-2 border-slate-900 py-2.5 font-black text-white shadow-[3px_3px_0_#0f172a]" style={{ background: theme.primary }}>
                                Let's go
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Met everyone */}
            <AnimatePresence>
                {complete && !celebrated && talk === null && (
                    <motion.div className="absolute inset-0 flex items-center justify-center bg-black/55 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className={`w-[min(480px,94vw)] p-6 text-center ${hud} !rounded-[24px]`} initial={{ scale: 0.8, rotate: -2 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}>
                            <Sparkles className="mx-auto mb-2" size={34} style={{ color: theme.primary }} />
                            <h3 className="text-2xl font-black text-slate-900 mb-2">You met everyone on board!</h3>
                            <p className="text-slate-600 mb-5">That is everything {firstName} has built and everywhere they have worked. If you would like to talk about it for real:</p>
                            <div className="flex flex-wrap justify-center gap-2 mb-3">
                                <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 px-4 py-2 font-black text-white no-underline shadow-[2px_2px_0_#0f172a]" style={{ background: theme.primary }}><LinkedinIcon size={16} /> LinkedIn</a>
                                {person.email && <a href={`mailto:${person.email}`} className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-4 py-2 font-black text-slate-900 no-underline shadow-[2px_2px_0_#0f172a]"><Mail size={16} /> Email</a>}
                            </div>
                            <button onClick={() => setCelebrated(true)} className="text-sm font-black text-slate-500 hover:text-slate-900">Keep exploring</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
