/**
 * ComparisonTable.tsx — GoTransit Regina
 *
 * "Why GoTransit Regina?" section — bold VS battle card design.
 *
 * Layout: two large glass panels side-by-side with a glowing VS badge
 * in the centre. Each panel lists what you get (or don't get). No table,
 * no rows — purely visual and punchy.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { X, Check, Wifi, MapPin, Navigation, Bus, BarChart3 } from 'lucide-react';

interface Feature {
    label: string;
    icon: React.FC<{ size?: number; className?: string }>;
}

const goTransitFeatures: Feature[] = [
    { label: 'Live bus positions on your phone', icon: Navigation },
    { label: 'Real-time arrival estimates', icon: Wifi },
    { label: 'Click any stop for live arrivals', icon: MapPin },
    { label: 'Regina-specific routes & schedules', icon: Bus },
    { label: 'Smart route planning', icon: Navigation },
    { label: 'Admin dashboard & analytics', icon: BarChart3 },
];

const traditionalMissing: string[] = [
    'No real-time positions',
    'No live arrival estimates',
    'No stop-level arrival info',
    'Generic, city-agnostic data',
    'No smart route planning',
    'No admin tools or analytics',
];

export default function ComparisonTable() {
    return (
        <section className="py-24 relative">
            <div className="max-w-6xl mx-auto px-6">

                {/* Header */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-3xl sm:text-5xl font-bold mb-5" style={{ color: '#0f172a' }}>
                        Why <span style={{ color: '#003DA5' }}>GoTransit</span> Regina?
                    </h2>
                    <p className="text-xl max-w-xl mx-auto" style={{ color: '#64748b' }}>
                        Purpose-built for Regina riders, not a generic transit clone
                    </p>
                </motion.div>

                {/* Battle cards */}
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-stretch">

                    {/* Left — Traditional App (grey/muted) */}
                    <motion.div
                        className="rounded-3xl p-8 md:p-10 flex flex-col"
                        style={{
                            background: 'rgba(255,255,255,0.70)',
                            border: '1px solid rgba(0,0,0,0.08)',
                            boxShadow: '0 4px 30px rgba(0,0,0,0.06)',
                        }}
                        initial={{ opacity: 0, x: -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="mb-8">
                            <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
                                style={{ background: 'rgba(0,0,0,0.06)', color: '#64748b' }}>
                                Traditional Transit App
                            </span>
                            <h3 className="text-3xl font-bold" style={{ color: '#64748b' }}>Other Apps</h3>
                            <p className="text-base mt-2" style={{ color: '#94a3b8' }}>Generic tools not built for you</p>
                        </div>

                        <div className="space-y-4 flex-1">
                            {traditionalMissing.map((label) => (
                                <div key={label} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'rgba(239,68,68,0.1)' }}>
                                        <X size={16} className="text-red-400" strokeWidth={2.5} />
                                    </div>
                                    <span className="text-base" style={{ color: '#94a3b8' }}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Centre VS badge — absolute on md, inline on mobile */}
                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <motion.div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-xl select-none"
                            style={{
                                background: '#003DA5',
                                boxShadow: '0 0 0 6px rgba(0,61,165,0.12), 0 8px 32px rgba(0,61,165,0.35)',
                            }}
                            initial={{ scale: 0, rotate: -20 }}
                            whileInView={{ scale: 1, rotate: 0 }}
                            viewport={{ once: true }}
                            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.4 }}
                        >
                            VS
                        </motion.div>
                    </div>

                    {/* Right — GoTransit Regina (brand blue glow) */}
                    <motion.div
                        className="rounded-3xl p-8 md:p-10 flex flex-col relative overflow-hidden"
                        style={{
                            background: 'rgba(255,255,255,0.92)',
                            border: '2px solid rgba(0,61,165,0.22)',
                            boxShadow: '0 8px 60px rgba(0,61,165,0.14)',
                        }}
                        initial={{ opacity: 0, x: 40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        {/* Blue corner glow */}
                        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full"
                            style={{ background: 'rgba(0,61,165,0.10)', filter: 'blur(40px)' }} />

                        <div className="mb-8 relative">
                            <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4 text-white"
                                style={{ background: '#003DA5' }}>
                                ⭐ GoTransit Regina
                            </span>
                            <h3 className="text-3xl font-bold" style={{ color: '#003DA5' }}>GoTransit Regina</h3>
                            <p className="text-base mt-2" style={{ color: '#475569' }}>Designed for every Regina commuter</p>
                        </div>

                        <div className="space-y-4 flex-1 relative">
                            {goTransitFeatures.map(({ label, icon: Icon }, i) => (
                                <motion.div
                                    key={label}
                                    className="flex items-center gap-3"
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.35, delay: 0.3 + i * 0.07 }}
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'rgba(0,61,165,0.10)' }}>
                                        <Check size={16} className="text-[#003DA5]" strokeWidth={2.5} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Icon size={15} className="text-[#003DA5] flex-shrink-0" />
                                        <span className="text-base font-medium" style={{ color: '#0f172a' }}>{label}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                <motion.p
                    className="text-center text-sm mt-10"
                    style={{ color: '#94a3b8' }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                >
                    GoTransit Regina is built specifically for{' '}
                    <span className="font-medium" style={{ color: '#003DA5' }}>Regina's transit system and weather conditions</span>
                </motion.p>
            </div>
        </section>
    );
}
