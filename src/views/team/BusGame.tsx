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
     one you have not met, running (Shift), a hop (Space), and dragging to look around.
   - Conversations branch, as in RPGs: you pick what to ask. The questions are the ones a hiring
     manager asks: what problem did it solve, what did this person do, how does it work, what came
     of it. Achievements reward asking everything, and the journal tallies the skills you have seen
     and offers a summary to copy for later. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, BookOpen, Check, ClipboardCopy, Compass, GithubIcon, LinkedinIcon, List, Mail, MessageCircle, Sparkles, Trophy, X } from 'lucide-react';
import type { CharacterTheme } from '../../models/data/characterThemes';
import type { TeamMember } from '../../models/data/team';
import { useRideDiscoveries } from '../../controllers/useRideDiscoveries';
import type { createBusScene, GameState, Talker } from './busScene';
import type { RideItem } from './BusRide';

export interface Passenger { item: RideItem; zone: string; seat: number }
type Scene = ReturnType<typeof createBusScene>;
/** One thing you can ask someone; `card` answers also show the result, tools and links */
type Question = { key: string; label: string; text: string; card?: boolean };
type Toast = { kind: 'met' | 'badge'; text: string };

const DRIVER_ID = '__driver';
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const CHAR_MS = 30, PAUSE_MS = 220;
const key = (label: string) => <kbd className="inline-flex min-w-[1.6rem] justify-center rounded-md border-2 border-slate-900 bg-white px-1.5 text-xs font-black text-slate-900 shadow-[0_2px_0_#0f172a]">{label}</kbd>;

export default function BusGame({ scene, people, person, theme, onExit, onList }: {
    scene: Scene; people: Passenger[]; person: TeamMember; theme: CharacterTheme; onExit: () => void; onList: () => void;
}) {
    const firstName = person.name.split(' ')[0];
    const { met, meet, asked, ask, badges, earn } = useRideDiscoveries(person.slug);
    const [game, setGame] = useState<GameState | null>(null);
    const [talk, setTalk] = useState<Talker | null>(null);
    /* null while they greet you; then the key of the question being answered */
    const [view, setView] = useState<string | null>(null);
    const [shown, setShown] = useState(0);
    const [journal, setJournal] = useState(false);
    const [help, setHelp] = useState(() => { try { return !localStorage.getItem('ride-help-seen'); } catch { return true; } });
    const pending = useRef<Talker | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [copied, setCopied] = useState(false);
    const touch = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches, []);

    const total = people.length + 1;
    const found = people.filter(p => met.has(p.item.title)).length + (met.has(DRIVER_ID) ? 1 : 0);
    /* Returning visitors who already met everyone are not congratulated again */
    const [celebrated, setCelebrated] = useState(() => found === total);
    const nameOf = (t: Talker) => (t === 'driver' ? `${firstName}, the driver` : people[t].item.title);

    const idOf = useCallback((t: Talker) => (t === 'driver' ? DRIVER_ID : people[t].item.title), [people]);
    /* What you can ask each person, and how they greet you */
    const questionsFor = useCallback((t: Talker): Question[] => {
        if (t === 'driver') {
            const study = [person.education && `I'm studying for a ${person.education.replace(' · ', ', ')}.`, person.honours.length && `${person.honours.map(h => h.name).join(' and ')}.`, person.certifications.length && `Certificates: ${person.certifications.map(c => `${c.name} (${c.issuer})`).join('; ')}.`].filter(Boolean).join(' ');
            return [
                { key: 'who', label: 'Who are you?', text: person.pitch },
                ...(person.about[0] ? [{ key: 'why', label: 'Why build Transit Regina?', text: person.about[0] }] : []),
                ...(study ? [{ key: 'study', label: 'What do you study?', text: study }] : []),
                { key: 'contact', label: 'How can I reach you?', text: `Find me on LinkedIn or GitHub${person.email ? ', or email me' : ''}. I would love to talk about any of this.`, card: true },
            ];
        }
        const { item } = people[t];
        const list: Question[] = [];
        if (item.problem) list.push({ key: 'problem', label: 'What problem did it solve?', text: item.problem });
        if (item.did) list.push({ key: 'did', label: `What did ${firstName} do?`, text: item.did });
        else if (item.detail) list.push({ key: 'about', label: 'Tell me about it', text: item.detail });
        if (item.how) list.push({ key: 'how', label: 'How does it work?', text: item.how });
        if (item.stat || item.tags?.length || item.link) {
            list.push({
                key: 'result', label: item.stat ? 'What came of it?' : 'What was it built with?', card: true,
                text: item.did && item.detail ? item.detail : item.stat ? `${item.stat.value}: ${item.stat.label}.` : 'Here is what it was built with.',
            });
        }
        return list;
    }, [people, person, firstName]);
    const greetingFor = (t: Talker) => t === 'driver'
        ? `Hey, welcome aboard! I'm ${firstName}, ${person.title.toLowerCase()} of Transit Regina. Ask me anything.`
        : `Hi! I'm "${people[t].item.title}"${people[t].item.sub ? ` (${people[t].item.sub})` : ''}. What would you like to know?`;
    const questions = useMemo(() => (talk === null ? [] : questionsFor(talk)), [talk, questionsFor]);
    const answering = questions.find(q => q.key === view) ?? null;
    const text = talk === null ? '' : answering ? answering.text : greetingFor(talk);
    const typing = talk !== null && shown < text.length;
    const wasAsked = (t: Talker, key: string) => asked.has(`${idOf(t)}::${key}`);

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
        setTalk(t); setView(null); setShown(0); setJournal(false);
        const id = idOf(t);
        if (!met.has(id)) {
            setToasts(q => [...q, { kind: 'met', text: t === 'driver' ? `${firstName}, the driver` : people[t].item.title }]);
            try { navigator.vibrate?.(18); } catch { /* not supported */ }
        }
        meet(id);
    }, [scene, meet, people, met, firstName, idOf]);
    /* Toasts show one at a time */
    useEffect(() => { if (!toasts.length) return; const id = setTimeout(() => setToasts(q => q.slice(1)), 2600); return () => clearTimeout(id); }, [toasts]);

    const endTalk = useCallback(() => {
        scene.setTalking(null);
        scene.setMouth(false);
        setTalk(null);
    }, [scene]);

    const choose = useCallback((key: string) => {
        if (talk === null) return;
        ask(`${idOf(talk)}::${key}`);
        setView(key); setShown(0);
    }, [talk, ask, idOf]);
    /* First press finishes the line; the next asks the next question you have not asked yet; when
       there is nothing left, the talk ends */
    const advance = useCallback(() => {
        if (talk === null) return;
        if (typing) { setShown(text.length); return; }
        const next = questions.find(q => !asked.has(`${idOf(talk)}::${q.key}`) && q.key !== view);
        if (next) choose(next.key); else endTalk();
    }, [talk, typing, text.length, questions, asked, idOf, view, choose, endTalk]);

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
            } else if (talk !== null && !typing && /^Digit[1-9]$/.test(e.code)) {
                const n = Number(e.code.slice(5)) - 1;
                if (n < questions.length) choose(questions[n].key); else if (n === questions.length) endTalk();
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
    }, [scene, talk, game?.near, advance, startTalk, endTalk, journal, onExit, help, typing, questions, choose]);
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
    /* Achievements: earned once, shown as a toast, listed in the journal */
    const zones = useMemo(() => Array.from(new Set(people.map(p => p.zone))), [people]);
    const everythingAsked = (t: Talker) => questionsFor(t).every(q => wasAsked(t, q.key));
    const achievements = [
        { id: 'hello', name: 'First hello', got: found >= 1 },
        { id: 'driver', name: `Met ${firstName} at the wheel`, got: met.has(DRIVER_ID) },
        ...zones.map(z => ({ id: `zone:${z}`, name: `${z}: all met`, got: people.filter(p => p.zone === z).every(p => met.has(p.item.title)) })),
        { id: 'detective', name: 'Detective: asked someone everything', got: ['driver' as Talker, ...people.map((_, i) => i as Talker)].some(t => met.has(idOf(t)) && everythingAsked(t)) },
        { id: 'all', name: 'Full ride: met everyone', got: found === total },
    ];
    const newlyEarned = achievements.filter(a => a.got && !badges.has(a.id)).map(a => a.id).join('|');
    useEffect(() => {
        if (!newlyEarned) return;
        for (const id of newlyEarned.split('|')) {
            const a = achievements.find(x => x.id === id);
            earn(id);
            if (a) setToasts(q => [...q, { kind: 'badge', text: a.name }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [newlyEarned]);

    /* Skills seen so far: every tag on everyone you have met, most common first */
    const skillsSeen = useMemo(() => {
        const count = new Map<string, number>();
        people.forEach(p => { if (met.has(p.item.title)) p.item.tags?.forEach(t => count.set(t, (count.get(t) ?? 0) + 1)); });
        return [...count.entries()].sort((a, b) => b[1] - a[1]);
    }, [people, met]);
    /* A plain-text summary for a hiring manager to paste into notes */
    const copySummary = () => {
        const lines = [
            `${person.name}: ${person.title}, Transit Regina (${person.focus})`,
            person.education, '',
            ...zones.flatMap(z => [z.toUpperCase(), ...people.filter(p => p.zone === z).map(p => `- ${p.item.title}${p.item.stat ? ` (${p.item.stat.value} ${p.item.stat.label})` : ''}${p.item.did || p.item.detail ? `: ${p.item.did ?? p.item.detail}` : ''}`), '']),
            `Skills: ${person.skills.join(', ')}`,
            `LinkedIn: ${person.linkedin}`, `GitHub: ${person.github}`, ...(person.email ? [`Email: ${person.email}`] : []),
            `Portfolio: ${window.location.origin}/connect/${person.slug}`,
        ];
        navigator.clipboard?.writeText(lines.filter(l => l !== undefined).join('\n')).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => { /* clipboard blocked */ });
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
                {toasts[0] && (
                    <motion.div
                        key={toasts[0].text}
                        className={`absolute left-1/2 top-28 sm:top-20 flex max-w-[92vw] items-center gap-2 px-4 py-2 ${hud} ${toasts[0].kind === 'badge' ? '!bg-amber-300' : ''}`}
                        initial={{ opacity: 0, y: -16, x: '-50%', scale: 0.9 }} animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }} exit={{ opacity: 0, y: -10, x: '-50%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    >
                        {toasts[0].kind === 'badge' ? <Trophy size={18} className="text-slate-900" /> : <Sparkles size={18} style={{ color: theme.primary }} />}
                        <span className="truncate text-sm font-black text-slate-900">{toasts[0].kind === 'badge' ? `Achievement: ${toasts[0].text}` : `New in your journal: ${toasts[0].text}`}</span>
                        {toasts[0].kind === 'met' && <span className="text-xs font-black text-slate-400">{found}/{total}</span>}
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
                {talk !== null && (
                    <motion.div
                        className="absolute inset-x-3 bottom-3 sm:inset-x-auto sm:left-1/2 sm:w-[min(780px,92vw)] sm:-translate-x-1/2 sm:bottom-6"
                        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
                    >
                        <div className="relative rounded-[22px] border-[3px] border-slate-900 bg-white shadow-[6px_6px_0_#0f172a]">
                            <div className="absolute -top-4 left-5 z-10 flex items-center gap-2 rounded-full border-[3px] border-slate-900 px-3 py-0.5 text-sm font-black text-white" style={{ background: theme.primary }}>
                                {talk === 'driver' ? `${person.name} · driving` : `Seat ${String(people[talk].seat).padStart(2, '0')} · ${people[talk].zone}`}
                            </div>
                            <div className="max-h-[62dvh] overflow-y-auto px-5 pt-6 pb-4 sm:px-7">
                            <div onClick={() => typing && setShown(text.length)} className={typing ? 'cursor-pointer' : ''}>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{talk === 'driver' ? `${person.title} of Transit Regina` : people[talk].item.title}</h3>
                                {answering && <p className="text-[11px] font-black uppercase tracking-[0.16em] mt-1" style={{ color: theme.primary }}>{answering.label}</p>}
                                <p className="mt-1.5 min-h-[3.5rem] text-[15px] sm:text-lg leading-relaxed text-slate-800" aria-live="polite">
                                    {text.slice(0, shown)}<span className="invisible">{text.slice(shown)}</span>
                                </p>
                            </div>

                            {/* Results, tools and links, under answers that have them */}
                            {!typing && answering?.card && (talk === 'driver' ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 px-4 py-2 font-black text-white no-underline shadow-[2px_2px_0_#0f172a]" style={{ background: theme.primary }}><LinkedinIcon size={16} /> Connect on LinkedIn</a>
                                    <a href={person.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-4 py-2 font-black text-slate-900 no-underline shadow-[2px_2px_0_#0f172a]"><GithubIcon size={16} /> GitHub</a>
                                    {person.email && <a href={`mailto:${person.email}`} className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-4 py-2 font-black text-slate-900 no-underline shadow-[2px_2px_0_#0f172a]"><Mail size={16} /> Email</a>}
                                </div>
                            ) : (() => {
                                const { item } = people[talk];
                                return (
                                    <div className="mt-2 flex flex-wrap items-end gap-4">
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
                            })())}

                            {/* What to ask next */}
                            {!typing && (
                                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                                    {questions.map((q, i) => {
                                        const done = wasAsked(talk, q.key);
                                        return (
                                            <button key={q.key} onClick={() => choose(q.key)} className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm font-black transition-colors ${q.key === view ? 'border-slate-900 bg-slate-900 text-white' : done ? 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-400' : 'border-slate-900 bg-white text-slate-900 hover:bg-amber-100'}`}>
                                                {!touch && <span className="text-xs opacity-60">{i + 1}</span>}
                                                {done ? <Check size={15} className="shrink-0" /> : <MessageCircle size={15} className="shrink-0" />}
                                                <span className="min-w-0">{q.label}</span>
                                            </button>
                                        );
                                    })}
                                    <button onClick={endTalk} className="flex items-center gap-2 rounded-xl border-2 border-slate-200 px-3 py-2 text-left text-sm font-black text-slate-500 hover:border-slate-400">
                                        {!touch && <span className="text-xs opacity-60">{questions.length + 1}</span>} Thanks, bye!
                                    </button>
                                </div>
                            )}
                            {!touch && (
                                <p className="mt-2 text-right text-xs font-bold text-slate-400">
                                    {typing ? <>{key('E')} skip</> : <>{key('1')}–{key(String(questions.length + 1))} choose · {key('E')} next question · {key('Esc')} leave</>}
                                </p>
                            )}
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

                            {/* Achievements */}
                            <div className="mb-4 flex flex-wrap gap-1.5">
                                {achievements.map(a => (
                                    <span key={a.id} className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-xs font-black ${a.got ? 'border-slate-900 bg-amber-300 text-slate-900' : 'border-slate-200 text-slate-400'}`}>
                                        <Trophy size={12} /> {a.name}
                                    </span>
                                ))}
                            </div>

                            {/* For hiring managers: what you have seen, at a glance */}
                            <div className="mb-5 rounded-2xl border-2 border-slate-900 p-3" style={{ background: theme.primarySoft }}>
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <span className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: theme.primaryDark }}>Skills seen so far</span>
                                    <button onClick={copySummary} className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-xs font-black text-slate-900 shadow-[2px_2px_0_#0f172a]">
                                        <ClipboardCopy size={13} /> {copied ? 'Copied!' : `Copy a summary of ${firstName}`}
                                    </button>
                                </div>
                                {skillsSeen.length
                                    ? <div className="flex flex-wrap gap-1.5">{skillsSeen.map(([t, n]) => <span key={t} className="rounded-full border-2 border-slate-900 bg-white px-2 py-0.5 text-xs font-bold text-slate-800">{t}{n > 1 && <span className="ml-1 text-slate-400">×{n}</span>}</span>)}</div>
                                    : <p className="text-xs font-bold text-slate-500">Talk to passengers to see what {firstName} works with.</p>}
                            </div>
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
                            <p className="text-slate-600 mb-4">Every passenger with a <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-900 bg-[#ffc21a] text-xs font-black">!</span> is something {firstName} built or a place they worked. Walk up, say hi, and ask what problem it solved, what {firstName} did and how it works.</p>
                            <ul className="space-y-2 text-sm font-bold text-slate-800 mb-5">
                                {touch ? (
                                    <>
                                        <li>Tap anyone to walk over and talk</li>
                                        <li>Tap the floor to walk there, or use the arrows</li>
                                        <li>Drag to look around</li>
                                        <li>Tap a question to ask it</li>
                                    </>
                                ) : (
                                    <>
                                        <li className="flex items-center gap-2">{key('W')}{key('A')}{key('S')}{key('D')} or arrows to walk · hold {key('Shift')} to run</li>
                                        <li className="flex items-center gap-2">{key('E')} to talk · {key('1')}{key('2')}{key('3')} pick a question · {key('Space')} to hop</li>
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
                            <button onClick={copySummary} className="mb-3 inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-[2px_2px_0_#0f172a]">
                                <ClipboardCopy size={15} /> {copied ? 'Copied!' : 'Copy a summary for your notes'}
                            </button>
                            <div><button onClick={() => setCelebrated(true)} className="text-sm font-black text-slate-500 hover:text-slate-900">Keep exploring</button></div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
