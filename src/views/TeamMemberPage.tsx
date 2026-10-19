/**
 * TeamMemberPage.tsx — Transit Regina
 *
 * One person's portfolio page at /connect/<slug> — the link they send to people.
 * Everything shown comes from that person's entry in src/models/data/team.ts.
 *
 * Parts that are still empty there are left out on the live site. In development they show as
 * dashed reminder boxes so it is obvious what is still to be written.
 */

import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, Award, BadgeCheck, Briefcase, FileText, GithubIcon, GraduationCap, LinkedinIcon, Mail, Rocket, Wrench } from 'lucide-react';
import TransitBackground from './landing/TransitBackground';
import IndependenceNotice from './components/IndependenceNotice';
import TransitPass from './team/TransitPass';
import BusRide, { type RideZone } from './team/BusRide';
import { MARKER_CHARACTERS } from '../models/data/markerCharacters';
import { CHARACTER_THEMES } from '../models/data/characterThemes';
import { TEAM, PROJECT } from '../models/data/team';

/* A reminder shown only while developing, where content is still to be added */
function ToFill({ children }: { children: React.ReactNode }) {
    if (!import.meta.env.DEV) return null;
    return (
        <div className="rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 px-5 py-4 text-amber-900">
            <span className="font-bold">To fill in:</span> {children}{' '}
            <span className="text-amber-700">(src/models/data/team.ts — hidden on the live site until added)</span>
        </div>
    );
}

function Section({ title, children, show = true }: { title: string; children: React.ReactNode; show?: boolean }) {
    if (!show) return null;
    return (
        <motion.section
            className="mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
        >
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-6">{title}</h2>
            {children}
        </motion.section>
    );
}

export default function TeamMemberPage() {
    const { slug } = useParams();
    const person = TEAM.find(p => p.slug === slug);
    if (!person) return <Navigate to="/connect" replace />;

    const dev = import.meta.env.DEV;
    const mascot = MARKER_CHARACTERS.find(c => c.id === person.character)!;
    const theme = CHARACTER_THEMES[person.character];
    const firstName = person.name.split(' ')[0];
    const others = TEAM.filter(p => p.slug !== person.slug);

    /* Who is on the bus: one passenger for each thing built, each job and each other project */
    const zones: RideZone[] = [
        { label: 'Built on Transit Regina', icon: Wrench, items: person.built },
        { label: "Where I've worked", icon: Briefcase, items: person.experience.map(job => ({ title: job.role, sub: `${job.org} · ${job.kind} · ${job.from} to ${job.to}`, hook: job.hook, detail: job.detail, tags: job.tags, stat: job.stat, areas: job.areas })) },
        { label: 'More things I built', icon: Rocket, items: person.projects.map(project => ({ title: project.name, sub: project.status, hook: project.hook, problem: project.problem, how: project.how, challenge: project.challenge, areas: project.areas, detail: project.blurb, tags: project.tags, stat: project.stat, link: project.link, linkLabel: project.linkLabel })) },
    ].filter(zone => zone.items.length > 0);

    const linkClass = 'inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold no-underline transition-all duration-200 hover:-translate-y-0.5';
    const quietLink = { background: 'white', color: theme.primary, border: `1.5px solid ${theme.border}` };

    return (
        <div className="min-h-screen relative" style={{ background: '#F7F8FA' }}>
            <TransitBackground />

            <MotionConfig reducedMotion="user">
                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-16" style={{ zIndex: 1 }}>

                    <Link to="/connect" className="inline-flex items-center gap-2 text-sm font-semibold text-[#003DA5] no-underline hover:underline">
                        <ArrowLeft size={16} />
                        The Transit Regina team
                    </Link>

                    {/* Everything sits on a frosted sheet, so the moving map never runs behind the words */}
                    <div className="mt-8 rounded-[36px] border border-white bg-white/80 backdrop-blur-md shadow-[0_20px_60px_rgba(15,23,42,0.08)] px-5 sm:px-10 md:px-14 pb-10">

                    {/* ── Who ── */}
                    <motion.header
                        className="flex flex-col md:flex-row md:items-center gap-10 md:gap-14 pt-12 pb-16"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }}
                    >
                        <motion.div
                            className="shrink-0 self-center md:self-start md:-rotate-3"
                            whileHover={{ rotate: 0, y: -6 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        >
                            <TransitPass person={person} number={TEAM.indexOf(person) + 1} />
                        </motion.div>

                        <div>
                            {person.openToWork && (
                                <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800 mb-3">
                                    <span className="h-2 w-2 rounded-full bg-green-500" /> Open to work
                                </span>
                            )}
                            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] text-slate-900 mb-3">{person.name}</h1>
                            <p className="text-lg sm:text-xl font-bold mb-4" style={{ color: theme.primary }}>
                                {person.title} of Transit Regina · {person.focus}
                            </p>
                            <p className="text-xl leading-relaxed text-slate-600 max-w-2xl mb-3">{person.pitch}</p>
                            {person.education && (
                                <p className="flex items-center gap-2 font-semibold text-slate-700 mb-6">
                                    <GraduationCap size={20} style={{ color: theme.primary }} /> {person.education}
                                </p>
                            )}

                            <div className="flex flex-wrap gap-3">
                                <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className={linkClass} style={{ background: theme.primary, color: 'white' }}>
                                    <LinkedinIcon size={18} /> LinkedIn
                                </a>
                                <a href={person.github} target="_blank" rel="noopener noreferrer" className={linkClass} style={quietLink}>
                                    <GithubIcon size={18} /> GitHub
                                </a>
                                {person.email && (
                                    <a href={`mailto:${person.email}`} className={linkClass} style={quietLink}>
                                        <Mail size={18} /> Email me
                                    </a>
                                )}
                                {person.resume && (
                                    <a href={person.resume} target="_blank" rel="noopener noreferrer" className={linkClass} style={quietLink}>
                                        <FileText size={18} /> Résumé
                                    </a>
                                )}
                            </div>
                        </div>
                    </motion.header>

                    <Section title="About me" show={person.about.length > 0 || dev}>
                        {person.about.length > 0
                            ? (
                                <div className="max-w-3xl space-y-5">
                                    {person.about.map((paragraph, i) => (
                                        <p key={i} className={i === 0 ? 'text-2xl leading-relaxed font-medium text-slate-800' : 'text-xl leading-relaxed text-slate-600'}>
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>
                            )
                            : <ToFill>a few sentences about {firstName}, in their own words.</ToFill>}
                    </Section>

                    <Section title="Skills">
                        <div className="flex flex-wrap gap-2">
                            {person.skills.map(skill => (
                                <span
                                    key={skill}
                                    className="rounded-full border px-4 py-2 font-semibold"
                                    style={{ background: theme.primarySoft, color: theme.primaryDark, borderColor: theme.border }}
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </Section>

                    <Section title="Certifications and honours" show={person.certifications.length + person.honours.length > 0}>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {[...person.honours.map(h => ({ ...h, kind: 'Honour' })), ...person.certifications.map(c => ({ ...c, kind: 'Certificate' }))].map(entry => (
                                <div key={entry.name + entry.date} className="flex items-start gap-3 rounded-2xl border bg-white px-4 py-3" style={{ borderColor: theme.border }}>
                                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: theme.primarySoft, color: theme.primary }}>
                                        {entry.kind === 'Honour' ? <Award size={18} /> : <BadgeCheck size={18} />}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-bold text-slate-900 leading-snug">{entry.name}</span>
                                        <span className="block text-sm text-slate-500">{entry.issuer} · {entry.date}</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Section>

                    </div>
                </div>

                {/* ── The ride: everything they have built and everywhere they have worked, on board their bus ── */}
                {(zones.length > 0) && <BusRide person={person} theme={theme} zones={zones} />}

                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-16" style={{ zIndex: 1 }}>
                    <div>
                    <div className="flex flex-wrap gap-x-8 gap-y-3 font-bold mb-8">
                        <Link to="/connect" className="inline-flex items-center gap-2 no-underline hover:underline" style={{ color: theme.primary }}>
                            Read how the whole project works <ArrowRight size={18} />
                        </Link>
                        <a href={PROJECT.site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 no-underline hover:underline" style={{ color: theme.primary }}>
                            Try it at {PROJECT.siteLabel} <ArrowUpRight size={18} />
                        </a>
                    </div>
                    {dev && (person.experience.length === 0 || person.projects.length === 0) && (
                        <div className="mb-8"><ToFill>{firstName}'s jobs and other projects, so they can take a seat on the bus.</ToFill></div>
                    )}

                    {/* ── The other half of the team ── */}
                    {others.map(other => (
                        <Link
                            key={other.slug}
                            to={`/connect/${other.slug}`}
                            className="group flex items-center gap-5 rounded-3xl bg-white/85 border border-slate-200 p-6 no-underline shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                        >
                            <img src={MARKER_CHARACTERS.find(c => c.id === other.character)!.src} alt="" className="w-16 h-16 drop-shadow-lg" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-500">Built together with</p>
                                <p className="text-xl font-bold text-slate-900">{other.name} · {other.focus}</p>
                            </div>
                            <ArrowRight size={22} className="text-[#003DA5] transition-transform group-hover:translate-x-1" />
                        </Link>
                    ))}

                    </div>
                    <IndependenceNotice className="mt-14 max-w-3xl mx-auto text-center" />
                </div>
            </MotionConfig>
        </div>
    );
}
