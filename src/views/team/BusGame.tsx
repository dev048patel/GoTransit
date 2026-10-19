/* Game mode for the bus ride: walk the bus yourself and meet everyone on it.

   Built on how exploration games and the best-known 3D portfolios handle this:
   - Move with the arrow keys or WASD, or click/tap anywhere to walk there (tap-to-move suits casual
     exploring on phones better than a bolted-on joystick; a small d-pad is there too).
   - Everyone you have not met carries a "!" marker you can see from a distance; walking close shows
     their name and an "E" prompt. Every prompt works by key and by click.
   - Conversations never make you wait. Each person opens with a one-line hook; the questions sit in
     the same place the whole time, so nothing jumps; answers fade in word by word in well under a
     second and then stay put until you choose. Nothing ever moves on by itself, so slow readers
     read at their own pace.
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
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, BookOpen, Check, ClipboardCopy, Compass, Play, GithubIcon, LinkedinIcon, List, Mail, MessageCircle, Sparkles, Trophy, X } from 'lucide-react';
import type { CharacterTheme } from '../../models/data/characterThemes';
import { SKILL_AREAS, type TeamMember } from '../../models/data/team';
import type { Emote } from './animeCharacter';
import { useRideDiscoveries } from '../../controllers/useRideDiscoveries';
import type { createBusScene, GameState, Talker } from './busScene';
import type { RideItem } from './BusRide';

export interface Passenger { item: RideItem; zone: string; seat: number }
type Scene = ReturnType<typeof createBusScene>;
/** One thing you can ask someone; `card` answers also show the result, tools and links */
type Question = { key: string; icon: string; label: string; text: string; card?: boolean; diagram?: boolean; emote?: Emote };
type Toast = { kind: 'met' | 'badge'; text: string };

const DRIVER_ID = '__driver';
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* A result such as "1,400+" or "1.5 s" counts up from zero the first time you see it */
function CountUp({ value }: { value: string }) {
    const match = value.match(/\d[\d,]*(\.\d+)?/);
    const [n, setN] = useState(0);
    const target = match ? Number(match[0].replace(/,/g, '')) : 0;
    useEffect(() => {
        if (!match) return;
        let raf = 0;
        const start = performance.now();
        const step = (now: number) => {
            const k = Math.min(1, (now - start) / 700);
            setN(target * (1 - (1 - k) ** 3));
            if (k < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [value]);   // eslint-disable-line react-hooks/exhaustive-deps
    if (!match) return <>{value}</>;
    const decimals = match[1] ? match[1].length - 1 : 0;
    const shown = n.toLocaleString('en-CA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return <>{value.replace(match[0], shown)}</>;
}

/* How Transit Regina fits together, with requests flowing along the lines */
function SystemDiagram({ color }: { color: string }) {
    const box = (x: number, y: number, w: number, title: string, sub: string, fill = '#ffffff') => (
        <g>
            <rect x={x} y={y} width={w} height={46} rx={12} fill={fill} stroke="#0f172a" strokeWidth={2.5} />
            <text x={x + w / 2} y={y + 20} textAnchor="middle" fontSize={13} fontWeight={900} fill="#0f172a">{title}</text>
            <text x={x + w / 2} y={y + 36} textAnchor="middle" fontSize={10} fontWeight={700} fill="#475569">{sub}</text>
        </g>
    );
    const flow = (d: string, dur: number, fill: string) => (
        <>
            <path d={d} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" />
            <circle r={5} fill={fill}><animateMotion dur={`${dur}s`} repeatCount="indefinite" path={d} /></circle>
        </>
    );
    return (
        <svg viewBox="0 0 600 200" className="mt-2 w-full max-w-[600px]" role="img" aria-label="Diagram: the rider's phone talks to our Express API, which uses Supabase, the TransitLive feed, Twilio and web push">
            {flow('M120 100 L240 100', 1.4, color)}
            {flow('M360 100 L470 40', 1.8, '#f59e0b')}
            {flow('M360 100 L470 100', 1.6, '#10b981')}
            {flow('M360 100 L470 160', 2.2, '#ef4444')}
            {box(10, 77, 110, "Rider's phone", 'React 19 · Google Maps', '#fef3c7')}
            {box(240, 77, 120, 'Our API', 'Express 5 · auth · rate limits')}
            {box(470, 17, 125, 'TransitLive feed', 'live buses every 1.5 s')}
            {box(470, 77, 125, 'Supabase', 'Postgres · row-level security')}
            {box(470, 137, 125, 'Twilio · Web Push', 'reminders')}
        </svg>
    );
}

/* An answer, fading in a word at a time (fast: the whole line is there in about half a second) */
function Reveal({ text }: { text: string }) {
    const words = text.split(' ');
    const step = Math.min(0.03, 0.45 / words.length);
    return (
        <>
            {words.map((w, i) => (
                <motion.span key={i} className="inline-block" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * step, duration: 0.18 }}>
                    {w}&nbsp;
                </motion.span>
            ))}
        </>
    );
}
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
    /* The quick tour: a short guided walk through the highlights, advanced only by the visitor */
    const [tour, setTour] = useState<number | null>(null);
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
            const study = [person.education, ...person.honours.map(h => h.name), ...person.certifications.map(c => `${c.name} (${c.issuer})`)].filter(Boolean).join(' · ');
            return [
                { key: 'who', icon: '👋', label: 'Who are you?', text: person.pitch, emote: 'point' as Emote },
                ...(person.about[0] ? [{ key: 'why', icon: '🚌', label: 'Why this app?', text: person.about[0], emote: 'think' as Emote }] : []),
                { key: 'system', icon: '🧩', label: 'How it all fits together', text: 'Your phone talks only to our API. The API checks who you are, then fetches live buses, saved data and reminders on your behalf, so no secret ever reaches the browser.', diagram: true, emote: 'explain' as Emote },
                ...(study ? [{ key: 'study', icon: '🎓', label: 'Studies & awards', text: study, emote: 'cheer' as Emote }] : []),
                { key: 'contact', icon: '✉️', label: "Let's talk", text: `I would love to hear from you. Pick whichever is easiest.`, card: true, emote: 'point' as Emote },
            ];
        }
        const { item } = people[t];
        const list: Question[] = [];
        if (item.problem) list.push({ key: 'problem', icon: '💡', label: 'The problem', text: item.problem, emote: 'think' });
        if (item.did) list.push({ key: 'did', icon: '🛠️', label: `What ${firstName} did`, text: item.did, emote: 'point' });
        else if (item.detail) list.push({ key: 'about', icon: '📖', label: 'Tell me more', text: item.detail, emote: 'explain' });
        if (item.how) list.push({ key: 'how', icon: '⚙️', label: 'How it works', text: item.how, emote: 'explain' });
        if (item.challenge) list.push({ key: 'challenge', icon: '🧗', label: 'The hard part', text: item.challenge, emote: 'think' });
        if (item.stat || item.tags?.length || item.link) {
            list.push({ key: 'result', icon: '🏆', label: item.stat ? 'The result' : 'Built with', card: true, text: '', emote: item.stat ? 'cheer' : 'point' });
        }
        return list;
    }, [people, person, firstName]);
    /* What they say the moment you walk up: their hook */
    const hookFor = (t: Talker) => t === 'driver' ? `Welcome aboard! I'm ${firstName}, and I drive this bus.` : people[t].item.hook || people[t].item.sub || people[t].item.detail || '';
    const questions = useMemo(() => (talk === null ? [] : questionsFor(talk)), [talk, questionsFor]);
    const answering = questions.find(q => q.key === view) ?? null;
    const wasAsked = (t: Talker, key: string) => asked.has(`${idOf(t)}::${key}`);

    /* Their mouth moves for a moment each time they answer, roughly as long as the answer takes to say */
    const talkTimer = useRef(0);
    const speak = useCallback((text: string) => {
        scene.setMouth(true);
        clearTimeout(talkTimer.current);
        talkTimer.current = window.setTimeout(() => scene.setMouth(false), Math.min(2600, 400 + text.split(' ').length * 110));
    }, [scene]);

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
        setTalk(t); setView(null); setJournal(false);
        speak(hookFor(t));
        const id = idOf(t);
        if (!met.has(id)) {
            setToasts(q => [...q, { kind: 'met', text: t === 'driver' ? `${firstName}, the driver` : people[t].item.title }]);
            try { navigator.vibrate?.(18); } catch { /* not supported */ }
        }
        meet(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene, meet, people, met, firstName, idOf, speak]);
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
        setView(key);
        const q = questions.find(x => x.key === key);
        speak(q?.text ?? '');
        scene.setEmote(q?.emote ?? null);
    }, [talk, ask, idOf, questions, speak, scene]);
    /* E asks the next question you have not asked yet; when there is nothing left, you say goodbye */
    const advance = useCallback(() => {
        if (talk === null) return;
        const next = questions.find(q => !asked.has(`${idOf(talk)}::${q.key}`) && q.key !== view);
        if (next) choose(next.key); else endTalk();
    }, [talk, questions, asked, idOf, view, choose, endTalk]);

    /* Read the scene ten times a second: position for the minimap, who is in reach, arrivals */
    useEffect(() => {
        const id = setInterval(() => {
            const s = scene.state();
            setGame(s);
            /* Walking to someone: start talking once they are within reach (not "the nearest person":
               two people sitting across the aisle from each other are the same distance away) */
            const t = pending.current;
            if (t !== null) {
                const p = t === 'driver' ? s.driver : s.passengers[t];
                if (Math.hypot(p.x - s.x, p.z - s.z) < 1.05) startTalk(t);
            }
        }, 100);
        return () => clearInterval(id);
    }, [scene, startTalk]);

    const goTo = useCallback((t: Talker) => { pending.current = t; scene.walkTo(t); setJournal(false); }, [scene]);

    /* The quick tour: the driver, then up to two highlights from each part of the bus (ones with a
       result first). It moves on only when the visitor presses "Next stop". */
    const tourStops = useMemo<Talker[]>(() => {
        const zoneNames = Array.from(new Set(people.map(p => p.zone)));
        const picks = zoneNames.flatMap(z => people.map((p, i) => ({ p, i })).filter(({ p }) => p.zone === z)
            .sort((a, b) => Number(!!b.p.item.stat) - Number(!!a.p.item.stat)).slice(0, 2).map(({ i }) => i as Talker));
        return ['driver', ...picks];
    }, [people]);
    const startTour = () => { setTour(0); goTo(tourStops[0]); };
    const endTour = () => setTour(null);
    const nextStop = () => {
        if (tour === null) return;
        scene.setTalking(null); setTalk(null);
        const n = tour + 1;
        if (n >= tourStops.length) { setTour(null); setToasts(q => [...q, { kind: 'badge', text: 'Quick tour complete' }]); return; }
        setTour(n); goTo(tourStops[n]);
    };

    const nextStopRef = useRef(nextStop);
    nextStopRef.current = nextStop;
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
            } else if (talk !== null && /^Digit[1-9]$/.test(e.code)) {
                const n = Number(e.code.slice(5)) - 1;
                if (n < questions.length) choose(questions[n].key); else if (n === questions.length) endTalk();
            } else if (e.code === 'KeyN' && tour !== null) nextStopRef.current();
            else if (e.code === 'KeyC') scene.resetCamera();
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
    }, [scene, talk, game?.near, advance, startTalk, endTalk, journal, onExit, help, questions, choose, tour]);
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
        if (talk !== null) return;   // reading: a stray click should not move anything on
        const box = e.currentTarget.getBoundingClientRect();
        const hit = scene.pickGame(e.clientX - box.left, e.clientY - box.top);
        if (!hit) return;
        if (hit.kind === 'floor') { pending.current = null; scene.walkToFloor(hit.x, hit.z); }
        else goTo(hit.kind === 'driver' ? 'driver' : hit.index);
    };
    /* Achievements: earned once, shown as a toast, listed in the journal */
    const zones = useMemo(() => Array.from(new Set(people.map(p => p.zone))), [people]);
    const everythingAsked = (t: Talker) => questionsFor(t).every(q => wasAsked(t, q.key));
    const challengeTotal = people.filter(p => p.item.challenge).length;
    const challengesHeard = people.filter(p => p.item.challenge && asked.has(`${p.item.title}::challenge`)).length;
    /* The skills map: for each area, how much of it you have discovered so far */
    const skillMap = SKILL_AREAS.map(area => {
        const inArea = people.filter(p => p.item.areas?.includes(area));
        return { area, total: inArea.length, found: inArea.filter(p => met.has(p.item.title)).length };
    }).filter(a => a.total > 0);
    const achievements = [
        { id: 'hello', name: 'First hello', got: found >= 1 },
        { id: 'driver', name: `Met ${firstName} at the wheel`, got: met.has(DRIVER_ID) },
        ...zones.map(z => ({ id: `zone:${z}`, name: `${z}: all met`, got: people.filter(p => p.zone === z).every(p => met.has(p.item.title)) })),
        { id: 'detective', name: 'Detective: asked someone everything', got: ['driver' as Talker, ...people.map((_, i) => i as Talker)].some(t => met.has(idOf(t)) && everythingAsked(t)) },
        { id: 'engineer', name: 'Engineer at heart: heard 5 hard-part stories', got: challengesHeard >= 5 },
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
            ...zones.flatMap(z => [z.toUpperCase(), ...people.filter(p => p.zone === z).flatMap(p => [
                `- ${p.item.title}${p.item.stat ? ` (${p.item.stat.value} ${p.item.stat.label})` : ''}${p.item.did || p.item.detail ? `: ${p.item.did ?? p.item.detail}` : ''}`,
                ...(p.item.challenge ? [`  Hardest part: ${p.item.challenge}`] : []),
            ]), '']),
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
                {tour === null && (
                    <button onClick={startTour} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-black text-slate-900 ${hud} !bg-amber-300`}>
                        <Play size={15} /> <span className="hidden sm:inline">Quick tour</span><span className="sm:hidden">Tour</span>
                    </button>
                )}
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
                            <div className="max-h-[66dvh] overflow-y-auto px-5 pt-6 pb-4 sm:px-7">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">{talk === 'driver' ? `${person.title} of Transit Regina` : people[talk].item.title}</h3>
                                        {talk !== 'driver' && people[talk].item.sub && <p className="text-xs sm:text-sm font-bold text-slate-500">{people[talk].item.sub}</p>}
                                    </div>
                                    {tour !== null && (
                                        <div className="shrink-0 text-right">
                                            <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Tour · {tour + 1} of {tourStops.length}</span>
                                            <button onClick={nextStop} className="mt-1 inline-flex items-center gap-1 rounded-full border-2 border-slate-900 bg-amber-300 px-3 py-1 text-sm font-black text-slate-900 shadow-[2px_2px_0_#0f172a]">
                                                {tour + 1 < tourStops.length ? 'Next stop' : 'Finish'} <ArrowRight size={15} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Their hook: there the moment you say hi */}
                                <p className="mt-2 text-lg sm:text-2xl font-black leading-snug" style={{ color: theme.primaryDark }}>“{hookFor(talk)}”</p>

                                {/* The answer: fades in fast, then stays until you choose something else */}
                                <div className="mt-3 min-h-[6.5rem] rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3">
                                    <AnimatePresence mode="wait">
                                        {answering ? (
                                            <motion.div key={answering.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                                                <p className="text-[11px] font-black uppercase tracking-[0.16em] mb-1" style={{ color: theme.primary }}>{answering.icon} {answering.label}</p>
                                                {answering.text && <p className="text-[15px] sm:text-lg leading-relaxed text-slate-800" aria-live="polite"><Reveal text={answering.text} /></p>}
                                                {answering.diagram && <SystemDiagram color={theme.primary} />}
                                                {answering.card && (talk === 'driver' ? (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 px-4 py-2 font-black text-white no-underline shadow-[2px_2px_0_#0f172a]" style={{ background: theme.primary }}><LinkedinIcon size={16} /> LinkedIn</a>
                                                        <a href={person.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-4 py-2 font-black text-slate-900 no-underline shadow-[2px_2px_0_#0f172a]"><GithubIcon size={16} /> GitHub</a>
                                                        {person.email && <a href={`mailto:${person.email}`} className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-4 py-2 font-black text-slate-900 no-underline shadow-[2px_2px_0_#0f172a]"><Mail size={16} /> {person.email}</a>}
                                                    </div>
                                                ) : (() => {
                                                    const { item } = people[talk];
                                                    return (
                                                        <div className="mt-2 flex flex-wrap items-center gap-3">
                                                            {item.stat && (
                                                                <motion.span initial={{ scale: 0.6, rotate: -4 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 14 }}
                                                                    className="rounded-2xl border-2 border-slate-900 px-3 py-1 text-3xl font-black leading-tight shadow-[3px_3px_0_#0f172a]" style={{ background: theme.primarySoft, color: theme.primaryDark }}>
                                                                    <CountUp value={item.stat.value} />
                                                                </motion.span>
                                                            )}
                                                            {item.stat && <span className="max-w-[16rem] text-base sm:text-lg font-black leading-snug text-slate-800">{item.stat.label}</span>}
                                                            {item.stat && (item.tags || item.link) && <span className="basis-full" />}
                                                            {item.tags && <div className="flex flex-wrap gap-1.5">{item.tags.map(t => <span key={t} className="rounded-full border-2 border-slate-900 bg-white px-2 py-0.5 text-xs font-bold text-slate-800">{t}</span>)}</div>}
                                                            {item.link && (
                                                                <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border-2 border-slate-900 px-3 py-1.5 text-sm font-black text-white no-underline shadow-[2px_2px_0_#0f172a]" style={{ background: theme.primary }}>
                                                                    {item.linkLabel || 'View on GitHub'} <ArrowUpRight size={15} />
                                                                </a>
                                                            )}
                                                        </div>
                                                    );
                                                })())}
                                            </motion.div>
                                        ) : (
                                            <motion.p key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-bold text-slate-400 pt-1">
                                                Ask {talk === 'driver' ? firstName : 'them'} something below. Take your time: nothing moves on until you choose.
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Questions: always here, always in the same place */}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {questions.map((q, i) => {
                                        const done = wasAsked(talk, q.key);
                                        return (
                                            <button key={q.key} onClick={() => choose(q.key)} className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-black transition-all active:scale-95 ${q.key === view ? 'border-slate-900 bg-slate-900 text-white' : done ? 'border-slate-300 bg-white text-slate-500 hover:border-slate-900' : 'border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0_#0f172a] hover:-translate-y-0.5'}`}>
                                                {!touch && <span className="text-[10px] opacity-50">{i + 1}</span>}
                                                <span>{q.icon}</span> {q.label} {done && q.key !== view && <Check size={13} />}{q.key === 'challenge' && !done && <span className="ml-0.5 rounded-full bg-rose-500 px-1.5 text-[9px] font-black text-white">HARD</span>}
                                            </button>
                                        );
                                    })}
                                    <button onClick={endTalk} className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-200 px-3 py-1.5 text-sm font-black text-slate-500 hover:border-slate-400">
                                        {!touch && <span className="text-[10px] opacity-50">{questions.length + 1}</span>} Bye 👋
                                    </button>
                                </div>
                                {!touch && (
                                    <p className="mt-2 text-right text-[11px] font-bold text-slate-400">
                                        {key('1')}–{key(String(questions.length + 1))} ask · {key('E')} next question{tour !== null && <> · {key('N')} next stop</>} · {key('Esc')} close
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* The tour, paused between stops */}
            {tour !== null && talk === null && (
                <div className={`absolute left-1/2 -translate-x-1/2 ${touch ? 'bottom-[250px]' : 'bottom-28'} flex items-center gap-2 px-3 py-2 ${hud}`}>
                    <span className="text-xs font-black text-slate-500">Tour · {tour + 1} of {tourStops.length}</span>
                    <button onClick={() => goTo(tourStops[tour])} className="rounded-full border-2 border-slate-900 px-3 py-1 text-xs font-black text-slate-900">Walk there</button>
                    <button onClick={nextStop} className="rounded-full border-2 border-slate-900 bg-amber-300 px-3 py-1 text-xs font-black text-slate-900">Next stop</button>
                    <button onClick={endTour} aria-label="End the tour" className="rounded-full p-1 text-slate-500 hover:text-slate-900"><X size={15} /></button>
                </div>
            )}

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

                            {/* Skills map: fills in as you meet people */}
                            <div className="mb-4 rounded-2xl border-2 border-slate-900 p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Skills map</span>
                                    <span className="text-[11px] font-black text-slate-500">🧗 Hard-part stories heard: {challengesHeard} of {challengeTotal}</span>
                                </div>
                                <div className="space-y-1.5">
                                    {skillMap.map(a => (
                                        <div key={a.area} className="flex items-center gap-2">
                                            <span className="w-32 shrink-0 text-xs font-black text-slate-700">{a.area}</span>
                                            <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-slate-900 bg-slate-100">
                                                <motion.div className="h-full" style={{ background: theme.primary }} initial={{ width: 0 }} animate={{ width: `${(a.found / a.total) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} />
                                            </div>
                                            <span className="w-10 shrink-0 text-right text-[11px] font-black text-slate-500">{a.found}/{a.total}</span>
                                        </div>
                                    ))}
                                </div>
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
                            <p className="text-sm font-bold text-slate-800 mb-3">Only have a minute? Press <span className="rounded-full border-2 border-slate-900 bg-amber-300 px-2 text-xs font-black">▶ Quick tour</span> and we will walk you to the highlights.</p>
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
