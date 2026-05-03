/**
 * HeroSection.tsx — GoTransit Regina
 *
 * Theme: CLEAN TRANSIT MAP — WHITE / OFF-WHITE
 *
 * Design concept:
 *  - Off-white (#F7F8FA) paper-map background — like a printed transit map
 *  - Dark charcoal route lines + bus beacons on the background (not neon)
 *  - Clean glassmorphic card with dark text — maximum readability
 *  - Solid brand blue (#003DA5) as the ONLY accent — no orange anywhere
 *  - Phone mockup with white screen showing a mini transit map
 *
 * This reads as: professional, trustworthy, clean — like a real transit authority app.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface HeroSectionProps {
    headline: string;
    subheadline: string;
    primaryCTA: string;
    trustIndicators: string[];
}


export default function HeroSection({ headline, subheadline, primaryCTA, trustIndicators }: HeroSectionProps) {
    return (
        <section className="relative min-h-screen flex items-center overflow-hidden">
            {/* Soft vignette to bring focus to the card */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, rgba(247,248,250,0.55) 100%)',
                }}
            />

            {/* ── Content ───────────────────────────────────────────────── */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                {/* Left — Text & CTAs */}
                <motion.div
                    className="lg:col-span-7 space-y-8"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                >
                    {/* Live badge */}
                    <motion.div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-white"
                        style={{ borderColor: '#003DA5', borderWidth: 1, color: '#003DA5' }}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                        <span className="text-sm font-medium">Live bus tracking · Regina Transit</span>
                    </motion.div>

                    {/* Card */}
                    <div
                        className="rounded-3xl p-10 border"
                        style={{
                            background: 'rgba(255,255,255,0.82)',
                            backdropFilter: 'blur(20px)',
                            borderColor: 'rgba(0,61,165,0.12)',
                            boxShadow: '0 8px 40px rgba(0,61,165,0.10)',
                        }}
                    >
                        {/* Headline */}
                        <motion.h1
                            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
                            style={{ color: '#0f172a' }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.4 }}
                        >
                            {headline.split(' ').map((word, i) => (
                                <span key={i}>
                                    {i === 3
                                        ? <span style={{ color: '#003DA5' }}>{word} </span>
                                        : `${word} `
                                    }
                                </span>
                            ))}
                        </motion.h1>

                        {/* Subheadline */}
                        <motion.p
                            className="text-xl md:text-2xl mb-8 leading-relaxed max-w-2xl"
                            style={{ color: '#475569' }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.6 }}
                        >
                            {subheadline}
                        </motion.p>

                        {/* CTA Buttons */}
                        <motion.div
                            className="flex flex-col sm:flex-row gap-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.8 }}
                        >
                            {/* Primary — solid brand blue, no orange */}
                            <Link
                                to="/login"
                                className="group px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 no-underline transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                                style={{
                                    background: '#003DA5',
                                    color: 'white',
                                    boxShadow: '0 8px 32px rgba(0,61,165,0.30)',
                                }}
                            >
                                {primaryCTA}
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>

                        </motion.div>

                        {/* Trust Indicators */}
                        <motion.div
                            className="flex flex-wrap gap-4 mt-8 text-sm"
                            style={{ color: '#64748b' }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.7, delay: 1 }}
                        >
                            {trustIndicators.map((indicator, index) => (
                                <span key={index} className="flex items-center gap-2">
                                    {index > 0 && <span style={{ color: '#cbd5e1' }}>•</span>}
                                    {indicator}
                                </span>
                            ))}
                        </motion.div>
                    </div>
                </motion.div>

                {/* Right — Phone mockup */}
                <motion.div
                    className="lg:col-span-5 flex justify-center"
                    initial={{ opacity: 0, x: 80 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.9, delay: 0.5 }}
                    style={{ perspective: 1000 }}
                >
                    <div
                        style={{
                            transform: 'rotateY(-10deg) rotateX(5deg)',
                            transformStyle: 'preserve-3d',
                        }}
                        className="relative"
                    >
                        {/* Phone shell */}
                        <div
                            className="relative w-72 h-[560px] rounded-[3rem] p-3"
                            style={{
                                background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                                boxShadow: '0 60px 120px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.08)',
                            }}
                        >
                            {/* Notch */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-3xl z-10" />

                            {/* Screen — white mini transit map */}
                            <div className="relative h-full rounded-[2.5rem] overflow-hidden" style={{ background: '#F7F8FA' }}>
                                {/* Grid */}
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        backgroundImage: `linear-gradient(rgba(0,61,165,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,61,165,0.06) 1px, transparent 1px)`,
                                        backgroundSize: '20px 20px',
                                    }}
                                />

                                {/* Mini route SVG in screen */}
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 560" preserveAspectRatio="xMidYMid slice">
                                    <path d="M 20,100 L 140,80 L 260,120" fill="none" stroke="#003DA5" strokeWidth="2" strokeOpacity="0.3" />
                                    <path d="M 20,280 L 100,240 L 200,270 L 260,240" fill="none" stroke="#1a2744" strokeWidth="2" strokeOpacity="0.3" />
                                    <path d="M 140,20 L 130,180 L 150,380 L 140,520" fill="none" stroke="#374151" strokeWidth="2" strokeOpacity="0.3" />
                                    {/* Moving bus dots */}
                                    <circle r="5" fill="#003DA5" fillOpacity="0.8">
                                        <animateMotion dur="4s" repeatCount="indefinite" path="M 20,100 L 140,80 L 260,120" />
                                    </circle>
                                    <circle r="4" fill="#1a2744" fillOpacity="0.7">
                                        <animateMotion dur="5.5s" repeatCount="indefinite" path="M 20,280 L 100,240 L 200,270 L 260,240" />
                                    </circle>
                                    <circle r="4" fill="#374151" fillOpacity="0.6">
                                        <animateMotion dur="7s" repeatCount="indefinite" path="M 140,20 L 130,180 L 150,380 L 140,520" />
                                    </circle>
                                    {/* Stop rings */}
                                    <circle cx="140" cy="80" r="4" fill="white" stroke="#003DA5" strokeWidth="1.5" strokeOpacity="0.5" />
                                    <circle cx="100" cy="240" r="4" fill="white" stroke="#1a2744" strokeWidth="1.5" strokeOpacity="0.5" />
                                </svg>

                                {/* Top card */}
                                <div className="absolute top-10 left-3 right-3">
                                    <div
                                        className="rounded-2xl px-4 py-3 border"
                                        style={{ background: 'rgba(255,255,255,0.92)', borderColor: 'rgba(0,61,165,0.12)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
                                    >
                                        <div className="text-xs font-medium mb-0.5" style={{ color: '#64748b' }}>Tracking</div>
                                        <div className="font-bold text-sm" style={{ color: '#0f172a' }}>Route 3 — University</div>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                                            </span>
                                            <span className="text-xs font-medium text-green-600">2 buses nearby</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom ETA */}
                                <div className="absolute bottom-10 left-3 right-3">
                                    <div
                                        className="rounded-2xl px-4 py-3 border"
                                        style={{ background: 'rgba(255,255,255,0.92)', borderColor: 'rgba(0,61,165,0.12)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs" style={{ color: '#94a3b8' }}>Next bus</div>
                                                <div className="font-bold text-xs" style={{ color: '#0f172a' }}>Victoria Ave & Albert St</div>
                                            </div>
                                            <div
                                                className="rounded-xl px-3 py-1.5 text-center"
                                                style={{ background: '#003DA5' }}
                                            >
                                                <div className="text-white font-bold text-lg leading-none">3</div>
                                                <div className="text-white/70 text-[9px]">min</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Shadow beneath */}
                        <div
                            className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-52 h-16 rounded-full"
                            style={{ background: 'rgba(0,61,165,0.15)', filter: 'blur(24px)' }}
                        />
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
