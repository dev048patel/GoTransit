import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';

interface HeroSectionProps {
    headline: string;
    subheadline: string;
    primaryCTA: string;
    secondaryCTA: string;
    trustIndicators: string[];
}

export default function HeroSection({ headline, subheadline, primaryCTA, secondaryCTA, trustIndicators }: HeroSectionProps) {
    return (
        <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#003DA5] via-[#0066FF] to-[#FF6B35]">
            {/* Animated Background Orbs */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div
                    className="absolute top-20 left-10 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl"
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -50, 0],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-3xl"
                    animate={{
                        x: [0, -80, 0],
                        y: [0, 80, 0],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"
                    animate={{
                        x: [0, 50, 0],
                        y: [0, -80, 0],
                        scale: [1, 1.3, 1],
                    }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                {/* Left Content (60%) */}
                <motion.div
                    className="lg:col-span-7 space-y-8"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    {/* Glassmorphic Card */}
                    <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-10 border border-white/20 shadow-2xl">
                        {/* Headline with Gradient Text */}
                        <motion.h1
                            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-orange-200 bg-clip-text text-transparent leading-tight"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                        >
                            {headline}
                        </motion.h1>

                        {/* Subheadline */}
                        <motion.p
                            className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed max-w-2xl"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                        >
                            {subheadline}
                        </motion.p>

                        {/* CTA Buttons */}
                        <motion.div
                            className="flex flex-col sm:flex-row gap-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.8 }}
                        >
                            {/* Primary CTA */}
                            <button className="group px-8 py-4 bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white rounded-xl font-bold text-lg shadow-[0_20px_60px_rgba(255,107,53,0.4)] hover:shadow-[0_25px_80px_rgba(255,107,53,0.5)] hover:scale-105 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2">
                                {primaryCTA}
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>

                            {/* Secondary CTA */}
                            <button className="px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-xl font-bold text-lg border-2 border-white/30 hover:bg-white/20 hover:border-white/50 transition-all duration-300 flex items-center justify-center gap-2">
                                <Play size={20} />
                                {secondaryCTA}
                            </button>
                        </motion.div>

                        {/* Trust Indicators */}
                        <motion.div
                            className="flex flex-wrap gap-4 mt-8 text-white/80 text-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 1 }}
                        >
                            {trustIndicators.map((indicator, index) => (
                                <span key={index} className="flex items-center gap-2">
                                    {index > 0 && <span className="text-white/40">•</span>}
                                    {indicator}
                                </span>
                            ))}
                        </motion.div>
                    </div>
                </motion.div>

                {/* Right Phone Mockup (40%) */}
                <motion.div
                    className="lg:col-span-5 flex justify-center"
                    initial={{ opacity: 0, x: 100, rotateY: -15 }}
                    animate={{ opacity: 1, x: 0, rotateY: 0 }}
                    transition={{ duration: 1, delay: 0.4 }}
                    style={{ perspective: 1000 }}
                >
                    <div
                        className="relative"
                        style={{
                            transform: 'rotateY(15deg) rotateX(-10deg)',
                            transformStyle: 'preserve-3d',
                        }}
                    >
                        {/* Phone Frame */}
                        <div className="relative w-80 h-[600px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-[3rem] p-3 shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
                            {/* Notch */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-gray-900 rounded-b-3xl z-10" />

                            {/* Screen */}
                            <div className="relative h-full bg-gradient-to-br from-blue-50 to-orange-50 rounded-[2.5rem] overflow-hidden">
                                {/* Mockup Content Placeholder */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center p-8">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                            <span className="text-3xl">🚌</span>
                                        </div>
                                        <p className="text-gray-700 font-semibold text-lg">App Screen Mockup</p>
                                        <p className="text-gray-500 text-sm mt-2">Bus tracking interface</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Glowing Shadow */}
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-500/30 blur-3xl rounded-full" />
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
