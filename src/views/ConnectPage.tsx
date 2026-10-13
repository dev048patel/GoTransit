/**
 * ConnectPage.tsx — Transit Regina
 *
 * The team page at /connect: Transit Regina told as a project case study — what we built, how it
 * works under the hood, and the two people behind it, each linking to a personal page
 * (/connect/<slug>, see TeamMemberPage.tsx).
 *
 * All wording and numbers live in src/models/data/team.ts.
 */

import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig, useScroll } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, Bus, Database, Monitor, Navigation, Map, Clock, Route, Server, Smile, Heart } from 'lucide-react';
import TransitBackground from './landing/TransitBackground';
import { MapDemo } from './landing/sections/FeatureDemos';
import TransitPass from './team/TransitPass';
import TeamBus, { RidingBus, Road } from './team/TeamBus';
import { MARKER_CHARACTERS } from '../models/data/markerCharacters';
import { CHARACTER_THEMES } from '../models/data/characterThemes';
import { TEAM, PROJECT, PROJECT_NUMBERS, BUILD_NUMBERS, PROJECT_FEATURES, ARCHITECTURE, HARD_PARTS, STACK, TIMELINE } from '../models/data/team';

/* Both of us on board: a photo when there is one, otherwise that person's character */
const TEAM_RIDERS = TEAM.map(person => ({
    src: person.photo || MARKER_CHARACTERS.find(c => c.id === person.character)!.src,
    isPhoto: !!person.photo,
}));

const OUR_BUS = { riders: TEAM_RIDERS, color: '#0a63e8', colorDark: '#003DA5', sign: 'ALL ROUTES' };
const TIER_ICONS = [Monitor, Server, Database];

/* A bus-stop sign on the road */
function StopSign({ className = '' }: { className?: string }) {
    return (
        <span className={`absolute z-10 w-7 h-7 -ml-3.5 rounded-lg bg-[#003DA5] border-2 border-white text-white flex items-center justify-center shadow-md ${className}`}>
            <Bus size={14} />
        </span>
    );
}

/* The bus shuttling along the "under the hood" road: out, a pause at the far stop, then back */
function ShuttleBus() {
    const [outbound, setOutbound] = useState(true);
    const [moving, setMoving] = useState(true);
    return (
        <motion.div
            className="absolute -ml-[95px] -mt-[72px]"
            initial={{ left: '0%' }}
            animate={{ left: outbound ? '100%' : '0%' }}
            transition={{ duration: 6.5, ease: 'easeInOut' }}
            onAnimationStart={() => setMoving(true)}
            onAnimationComplete={() => { setMoving(false); setTimeout(() => setOutbound(o => !o), 1400); }}
        >
            <TeamBus {...OUR_BUS} flipped={!outbound} moving={moving} />
        </motion.div>
    );
}

const iconMap: { [key: string]: React.FC<{ size?: number }> } = { Navigation, Map, Clock, Route, Smile, Heart };

/* Fades a block in as it scrolls into view */
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay }}
        >
            {children}
        </motion.div>
    );
}

function SectionTitle({ kicker, children }: { kicker: string; children: React.ReactNode }) {
    return (
        <Reveal className="mb-10">
            <p className="text-sm font-bold uppercase tracking-widest text-[#003DA5]/70 mb-2">{kicker}</p>
            <h2 className="text-3xl sm:text-5xl font-bold text-slate-900">{children}</h2>
        </Reveal>
    );
}

/* ── The route so far: the project's history as a line of stops, with a bus that rides down it as you scroll ── */
function Timeline() {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start 60%', 'end 60%'] });
    return (
        <div ref={ref} className="relative">
            {/* The road, and the two of us riding it down the page */}
            <Road progress={scrollYProgress} className="top-0 bottom-0 left-[42px] md:left-1/2" />
            <RidingBus progress={scrollYProgress} className="left-[42px] md:left-1/2 scale-[0.46] md:scale-100" {...OUR_BUS} />

            <div className="space-y-12 py-6">
                {TIMELINE.map((stop, i) => (
                    <motion.div
                        key={stop.when}
                        className={`relative pl-28 md:pl-0 md:w-1/2 ${i % 2 === 0 ? 'md:pr-28 md:text-right' : 'md:ml-auto md:pl-28'}`}
                        initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* The stop on the line */}
                        <StopSign className={`top-0 left-[42px] ${i % 2 === 0 ? 'md:left-full' : 'md:left-0'}`} />
                        <span className="inline-block rounded-full bg-[#003DA5] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white mb-2">{stop.when}</span>
                        <h3 className="text-2xl font-bold text-slate-900 mb-1">{stop.title}</h3>
                        <p className="text-slate-600 leading-relaxed">{stop.detail}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

export default function ConnectPage() {
    return (
        <div className="min-h-screen relative" style={{ background: '#F7F8FA' }}>
            <TransitBackground />

            <MotionConfig reducedMotion="user">
                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16" style={{ zIndex: 1 }}>

                    <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#003DA5] no-underline hover:underline">
                        <ArrowLeft size={16} />
                        Back to Home
                    </Link>

                    {/* ── Opening ── */}
                    <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center pt-14 pb-20">
                        <motion.div
                            className="lg:col-span-6"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7 }}
                        >
                            <p className="text-sm font-bold uppercase tracking-widest text-[#003DA5]/70 mb-4">The team behind Transit Regina</p>
                            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.03] text-slate-900 mb-6">
                                Two students. One city. <span className="bg-gradient-to-r from-[#003DA5] to-[#0066FF] bg-clip-text text-transparent">Every bus.</span>
                            </h1>
                            <p className="text-xl leading-relaxed text-slate-600 mb-8">{PROJECT.story}</p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <a
                                    href={PROJECT.site}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-8 py-4 rounded-2xl bg-[#003DA5] text-white font-bold text-lg flex items-center justify-center gap-2 no-underline shadow-[0_10px_32px_rgba(0,61,165,0.35)] transition-all duration-300 hover:-translate-y-1"
                                >
                                    Visit {PROJECT.siteLabel}
                                    <ArrowUpRight size={20} />
                                </a>
                                <a
                                    href="#team"
                                    className="px-8 py-4 rounded-2xl bg-white text-[#003DA5] font-bold text-lg flex items-center justify-center no-underline border-2 border-[#003DA5]/20 transition-all duration-300 hover:-translate-y-1 hover:border-[#003DA5]/50"
                                >
                                    Our portfolios
                                </a>
                            </div>
                        </motion.div>

                        {/* The two of us, as transit passes */}
                        <motion.div
                            className="lg:col-span-6 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-0"
                            initial={{ opacity: 0, x: 60 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            {TEAM.map((person, i) => (
                                <Link
                                    key={person.slug}
                                    to={`/connect/${person.slug}`}
                                    aria-label={`${person.name}'s portfolio`}
                                    className={`block no-underline transition-all duration-300 hover:z-10 hover:-translate-y-3 hover:rotate-0 ${i === 0 ? 'sm:-rotate-6 sm:-mr-10' : 'sm:rotate-6 sm:mt-16'}`}
                                >
                                    <TransitPass person={person} number={i + 1} />
                                </Link>
                            ))}
                        </motion.div>
                    </section>

                    {/* ── Numbers ── */}
                    <Reveal className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 lg:divide-x divide-[#003DA5]/15 mb-24">
                        {PROJECT_NUMBERS.map(n => (
                            <div key={n.label} className="text-center px-4">
                                <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#003DA5]/70 mb-1">{n.label}</div>
                                <div className="text-4xl sm:text-5xl font-black text-[#003DA5]">{n.value}</div>
                            </div>
                        ))}
                    </Reveal>

                    {/* ── The route so far ── */}
                    <section className="mb-24">
                        <SectionTitle kicker="The route so far">From the first commit to today</SectionTitle>
                        <Timeline />
                    </section>

                    {/* ── What we built ── */}
                    <section className="mb-24">
                        <SectionTitle kicker="What we built">Six things that put the bus on your side</SectionTitle>
                        <Reveal className="max-w-3xl mx-auto mb-14">
                            <div className="rounded-2xl overflow-hidden bg-slate-800 shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
                                <div className="flex items-center gap-1.5 px-4 py-3">
                                    <span className="w-3 h-3 rounded-full bg-red-500" />
                                    <span className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <span className="w-3 h-3 rounded-full bg-green-500" />
                                    <span className="ml-3 flex-1 rounded-md bg-slate-900/60 px-3 py-1 text-xs font-mono text-slate-400">{PROJECT.siteLabel}</span>
                                </div>
                                <div className="relative" style={{ aspectRatio: '16 / 10' }}>
                                    <MapDemo />
                                </div>
                            </div>
                        </Reveal>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
                            {PROJECT_FEATURES.map((f, i) => {
                                const Icon = iconMap[f.icon] || Map;
                                return (
                                    <Reveal key={f.title} delay={i * 0.06} className="flex gap-4">
                                        <span className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-[#003DA5] to-[#0066FF] text-white flex items-center justify-center shadow-lg shadow-blue-200">
                                            <Icon size={22} />
                                        </span>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-1">{f.title}</h3>
                                            <p className="text-slate-600 leading-relaxed">{f.detail}</p>
                                        </div>
                                    </Reveal>
                                );
                            })}
                        </div>
                    </section>

                    {/* ── Under the hood ── */}
                    <section className="mb-24">
                        <SectionTitle kicker="Under the hood">How a tap becomes a bus on the map</SectionTitle>

                        {/* The three tiers, joined like stops on a line */}
                        <div className="relative grid grid-cols-1 md:grid-cols-3 mb-14 md:pt-16">
                            {ARCHITECTURE.map((tier, i) => (
                                <Reveal key={tier.name} delay={i * 0.15} className="relative flex gap-5 pb-10 last:pb-0 md:flex-col md:gap-5 md:pb-0 md:pr-8">
                                    {i < ARCHITECTURE.length - 1 && (
                                        <div className="absolute bg-slate-700 rounded-full left-[22px] top-7 bottom-0 w-3 md:left-7 md:top-[22px] md:bottom-auto md:w-full md:h-3">
                                            <div className="hidden md:block absolute inset-x-3 top-1/2 h-[2px] -mt-px" style={{ background: 'repeating-linear-gradient(90deg, #f8fafc 0 10px, transparent 10px 22px)' }} />
                                        </div>
                                    )}
                                    <div className="relative z-10 w-14 h-14 shrink-0 rounded-2xl bg-[#003DA5] border-[3px] border-white text-white flex items-center justify-center shadow-lg shadow-blue-200">
                                        {React.createElement(TIER_ICONS[i] || Server, { size: 24 })}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900">{tier.name}</h3>
                                        <p className="text-sm font-semibold text-[#003DA5] mb-2">{tier.tech}</p>
                                        <p className="text-slate-600 leading-relaxed">{tier.detail}</p>
                                    </div>
                                </Reveal>
                            ))}

                            {/* The bus running from the browser to the data and back (wide screens) */}
                            <div className="hidden md:block absolute top-[92px] left-7 right-[calc(33.333%-1.75rem)] z-20 pointer-events-none">
                                <ShuttleBus />
                            </div>
                        </div>

                        {/* The hard parts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
                            {HARD_PARTS.map((part, i) => (
                                <Reveal key={part.title} delay={i * 0.08} className="rounded-2xl bg-white/85 border border-[#003DA5]/10 p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">{part.title}</h3>
                                    <p className="text-slate-600 leading-relaxed">{part.detail}</p>
                                </Reveal>
                            ))}
                        </div>

                        {/* The work, counted */}
                        <Reveal className="rounded-3xl bg-[#003DA5] text-white px-6 py-8 grid grid-cols-2 lg:grid-cols-4 gap-y-6 mb-10">
                            {BUILD_NUMBERS.map(n => (
                                <div key={n.label} className="text-center px-3">
                                    <div className="text-4xl sm:text-5xl font-black">{n.value}</div>
                                    <div className="text-sm text-white/75 mt-1">{n.label}</div>
                                </div>
                            ))}
                        </Reveal>

                        <Reveal className="flex flex-wrap gap-2">
                            {STACK.map(tech => (
                                <span key={tech} className="rounded-full bg-white border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">{tech}</span>
                            ))}
                        </Reveal>
                    </section>

                    {/* ── The two of us ── */}
                    <section id="team" className="mb-20 scroll-mt-8">
                        <SectionTitle kicker="The team">The two of us</SectionTitle>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {TEAM.map((person, i) => {
                                const mascot = MARKER_CHARACTERS.find(c => c.id === person.character)!;
                                const theme = CHARACTER_THEMES[person.character];
                                return (
                                    <Reveal key={person.slug} delay={i * 0.15}>
                                        <Link
                                            to={`/connect/${person.slug}`}
                                            className="group block h-full rounded-3xl border p-7 sm:p-8 no-underline shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
                                            style={{ background: theme.surface2, borderColor: theme.border }}
                                        >
                                            <div className="flex items-center gap-5 mb-6">
                                                {person.photo
                                                    ? <img src={person.photo} alt={person.name} className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-lg" />
                                                    : <img src={mascot.src} alt="" className="w-24 h-24 drop-shadow-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />}
                                                <div>
                                                    <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">{person.name}</h3>
                                                    <p className="font-bold" style={{ color: theme.primary }}>{person.title}</p>
                                                    <p className="text-sm text-slate-600">{person.focus}</p>
                                                </div>
                                            </div>
                                            <ul className="space-y-2 mb-7 pl-0 list-none">
                                                {person.built.slice(0, 4).map(b => (
                                                    <li key={b.title} className="flex items-center gap-3 text-slate-700 font-medium">
                                                        <span className="w-2 h-2 shrink-0 rounded-full" style={{ background: theme.primary }} />
                                                        {b.title}
                                                    </li>
                                                ))}
                                            </ul>
                                            <span className="inline-flex items-center gap-2 font-bold" style={{ color: theme.primary }}>
                                                See {person.name.split(' ')[0]}'s portfolio
                                                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                            </span>
                                        </Link>
                                    </Reveal>
                                );
                            })}
                        </div>
                    </section>

                    <p className="text-center text-sm text-slate-400">
                        © 2026 Transit Regina · Built at the University of Regina
                    </p>
                </div>
            </MotionConfig>
        </div>
    );
}
