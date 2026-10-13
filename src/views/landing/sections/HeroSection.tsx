/**
 * HeroSection.tsx — Transit Regina
 *
 * The headline sits straight on the shared transit-map background (no card over it), beside a
 * phone running the same drawn live map the features section uses, with a character calling out
 * the next bus. Brand blue (#003DA5) is the only accent.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import { MapCanvas } from './FeatureDemos';
import { MARKER_CHARACTERS } from '../../../models/data/markerCharacters';

interface HeroSectionProps {
    headline: string;
    subheadline: string;
    primaryCTA: string;
    trustIndicators: string[];
}

const character = (id: string) => MARKER_CHARACTERS.find(c => c.id === id)!.src;

export default function HeroSection({ headline, subheadline, primaryCTA, trustIndicators }: HeroSectionProps) {
    return (
        <section className="relative min-h-screen flex items-center overflow-hidden">
            <MotionConfig reducedMotion="user">
                {/* Soft light behind the words so they read clearly over the map */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse 55% 60% at 28% 50%, rgba(247,248,250,0.92) 0%, rgba(247,248,250,0.6) 55%, transparent 100%)' }}
                />

                <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-32 pb-20 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                    {/* Left — the words */}
                    <motion.div
                        className="lg:col-span-7"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                    >
                        {/* Live badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-[#003DA5]/30 bg-white text-[#003DA5] shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                            </span>
                            <span className="text-sm font-semibold">Live bus tracking · Regina Transit</span>
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight leading-[1.02] text-slate-900 mb-7">
                            {headline.split(' ').map((word, i) => (
                                <React.Fragment key={i}>
                                    {i === 3
                                        ? <span className="bg-gradient-to-r from-[#003DA5] to-[#0066FF] bg-clip-text text-transparent">{word}</span>
                                        : word}{' '}
                                </React.Fragment>
                            ))}
                        </h1>

                        <p className="text-xl md:text-2xl leading-relaxed text-slate-600 max-w-2xl mb-10">
                            {subheadline}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 mb-10">
                            <Link
                                to="/login"
                                className="group px-9 py-4 rounded-2xl bg-[#003DA5] text-white font-bold text-lg flex items-center justify-center gap-2 no-underline shadow-[0_10px_32px_rgba(0,61,165,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,61,165,0.45)]"
                            >
                                {primaryCTA}
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <a
                                href="#features"
                                className="px-9 py-4 rounded-2xl bg-white text-[#003DA5] font-bold text-lg flex items-center justify-center gap-2 no-underline border-2 border-[#003DA5]/20 transition-all duration-300 hover:-translate-y-1 hover:border-[#003DA5]/50"
                            >
                                See it in action
                                <ChevronDown size={20} />
                            </a>
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-slate-600">
                            {trustIndicators.map(indicator => (
                                <span key={indicator} className="flex items-center gap-2 font-medium">
                                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                                        <Check size={13} strokeWidth={3} />
                                    </span>
                                    {indicator}
                                </span>
                            ))}
                        </div>
                    </motion.div>

                    {/* Right — the phone, with a character beside it */}
                    <motion.div
                        className="lg:col-span-5 flex justify-center"
                        initial={{ opacity: 0, x: 80 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.9, delay: 0.4 }}
                        style={{ perspective: 1000 }}
                    >
                        <div className="relative">
                            <div style={{ transform: 'rotateY(-10deg) rotateX(5deg)', transformStyle: 'preserve-3d' }}>
                                {/* Phone shell */}
                                <div
                                    className="relative w-72 h-[560px] rounded-[3rem] p-3"
                                    style={{
                                        background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                                        boxShadow: '0 60px 120px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.08)',
                                    }}
                                >
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-3xl z-10" />

                                    {/* Screen — the live map */}
                                    <div className="relative h-full rounded-[2.5rem] overflow-hidden">
                                        <MapCanvas />

                                        {/* You are here */}
                                        <div className="absolute left-[46%] top-[58%] -translate-x-1/2 -translate-y-1/2">
                                            <span className="absolute inset-0 m-auto h-11 w-11 animate-ping rounded-full bg-orange-400/40" />
                                            <img src={character('fox')} alt="" className="relative h-11 w-11 drop-shadow-md" />
                                        </div>

                                        <div className="absolute top-10 left-3 right-3 rounded-2xl bg-white/95 px-4 py-3 shadow-md">
                                            <div className="text-xs font-medium text-slate-500 mb-0.5">Tracking</div>
                                            <div className="font-bold text-sm text-slate-900">Route 3 — University</div>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                                                </span>
                                                <span className="text-xs font-medium text-green-600">2 buses nearby</span>
                                            </div>
                                        </div>

                                        <div className="absolute bottom-8 left-3 right-3 rounded-2xl bg-white/95 px-4 py-3 shadow-md flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-slate-400">Next bus</div>
                                                <div className="font-bold text-xs text-slate-900">Victoria Ave & Albert St</div>
                                            </div>
                                            <div className="rounded-xl px-3 py-1.5 text-center bg-[#003DA5]">
                                                <div className="text-white font-bold text-lg leading-none">3</div>
                                                <div className="text-white/70 text-[9px]">min</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* The character calling out the bus */}
                            <motion.div
                                className="absolute right-full -mr-8 bottom-24 hidden sm:flex flex-col items-end"
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 1.3 }}
                            >
                                <div className="mr-10 mb-1 rounded-2xl rounded-br-sm bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-xl border border-slate-100 whitespace-nowrap">
                                    Stay warm, 3 min!
                                </div>
                                <motion.img
                                    src={character('penguin')}
                                    alt=""
                                    className="w-20 h-20 drop-shadow-xl"
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                                />
                            </motion.div>

                            {/* Shadow beneath */}
                            <div
                                className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-52 h-16 rounded-full"
                                style={{ background: 'rgba(0,61,165,0.15)', filter: 'blur(24px)' }}
                            />
                        </div>
                    </motion.div>
                </div>
            </MotionConfig>
        </section>
    );
}
