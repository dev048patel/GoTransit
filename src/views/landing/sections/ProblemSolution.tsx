/**
 * ProblemSolution.tsx — GoTransit Regina
 *
 * "Built for Regina's Real Challenges" section.
 * Three white glass cards with brand-blue icon rings — one per challenge.
 * Consistent with the landing page white / #003DA5 palette.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Snowflake, Construction, Clock } from 'lucide-react';

interface ProblemSolutionProps {
    problemSolutions: Array<{
        title: string;
        problem: string;
        solution: string;
        icon: string;
    }>;
}

const iconMap: { [key: string]: React.FC<{ size?: number, className?: string }> } = {
    Snowflake,
    Construction,
    Clock
};

/* Accent per card — all in the blue family */
const ACCENTS = [
    { bg: 'rgba(0,61,165,0.07)', border: 'rgba(0,61,165,0.14)' },
    { bg: 'rgba(0,61,165,0.05)', border: 'rgba(0,61,165,0.10)' },
    { bg: 'rgba(0,61,165,0.09)', border: 'rgba(0,61,165,0.18)' },
];

export default function ProblemSolution({ problemSolutions }: ProblemSolutionProps) {
    return (
        <section className="py-24 relative">
            <div className="max-w-7xl mx-auto px-6">

                {/* Section Header */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-5xl font-bold mb-5" style={{ color: '#0f172a' }}>
                        Built for Regina's{' '}
                        <span style={{ color: '#003DA5' }}>Real Challenges</span>
                    </h2>
                    <p className="text-xl max-w-2xl mx-auto" style={{ color: '#64748b' }}>
                        We understand the unique difficulties of commuting in Regina
                    </p>
                </motion.div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {problemSolutions.map((item, index) => {
                        const Icon = iconMap[item.icon] || Clock;
                        const accent = ACCENTS[index % ACCENTS.length];

                        return (
                            <motion.div
                                key={item.title}
                                className="group relative rounded-3xl p-10 overflow-hidden transition-all duration-500 hover:-translate-y-3"
                                style={{
                                    background: 'rgba(255,255,255,0.88)',
                                    backdropFilter: 'blur(20px)',
                                    border: `1px solid ${accent.border}`,
                                    boxShadow: '0 6px 40px rgba(0,0,0,0.07)',
                                }}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.15 }}
                                whileHover={{
                                    boxShadow: '0 24px 80px rgba(0,61,165,0.15)',
                                }}
                            >
                                {/* Blue glow on hover */}
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                                    style={{ background: accent.bg }}
                                />

                                {/* Icon ring */}
                                <motion.div
                                    className="relative w-24 h-24 mx-auto mb-8 rounded-full flex items-center justify-center"
                                    style={{
                                        background: 'rgba(0,61,165,0.08)',
                                        border: '2px solid rgba(0,61,165,0.16)',
                                    }}
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ duration: 3 + index * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                    <Icon size={44} className="text-[#003DA5]" />
                                </motion.div>

                                {/* Title */}
                                <h3 className="text-2xl font-bold mb-6 text-center" style={{ color: '#0f172a' }}>
                                    {item.title}
                                </h3>

                                {/* Problem */}
                                <div className="mb-5 rounded-2xl p-4" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
                                    <p className="text-sm font-semibold mb-1" style={{ color: '#ef4444' }}>❌ The Problem</p>
                                    <p className="text-sm leading-relaxed italic" style={{ color: '#64748b' }}>
                                        "{item.problem}"
                                    </p>
                                </div>

                                {/* Solution */}
                                <div className="rounded-2xl p-4" style={{ background: 'rgba(0,61,165,0.05)', border: '1px solid rgba(0,61,165,0.14)' }}>
                                    <p className="text-sm font-semibold mb-1" style={{ color: '#003DA5' }}>✅ Our Solution</p>
                                    <p className="text-sm font-medium leading-relaxed" style={{ color: '#0f172a' }}>
                                        "{item.solution}"
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
