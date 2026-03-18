/* Stats section for the landing page — animated counters showing route, stop, and accuracy metrics */
import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Route, MapPin, Target } from 'lucide-react';

interface StatsSectionProps {
    stats: Array<{
        label: string;
        value: string;
        icon: string;
    }>;
}

const iconMap: { [key: string]: React.FC<{ size?: number, className?: string }> } = {
    Route,
    MapPin,
    Target
};

// Counter animation component
function AnimatedCounter({ targetValue }: { targetValue: string }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true });

    // Extract number from string (e.g., "25+" => 25, "10,000+" => 10000)
    const numericValue = parseInt(targetValue.replace(/[^0-9]/g, '')) || 0;
    const suffix = targetValue.match(/[^0-9]+$/)?.[0] || '';

    useEffect(() => {
        if (!isInView) return;

        let start = 0;
        const duration = 2000; // 2 seconds
        const increment = numericValue / (duration / 16); // 60fps

        const timer = setInterval(() => {
            start += increment;
            if (start >= numericValue) {
                setCount(numericValue);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);

        return () => clearInterval(timer);
    }, [isInView, numericValue]);

    const formattedCount = count >= 1000 ? count.toLocaleString() : count.toString();

    const isNonNumeric = !/\d/.test(targetValue);
    if (isNonNumeric) {
        return <div ref={ref}>{targetValue}</div>;
    }

    return (
        <div ref={ref}>
            {formattedCount}{suffix}
        </div>
    );
}

export default function StatsSection({ stats }: StatsSectionProps) {
    return (
        <section className="relative py-24 overflow-hidden">
            <div className="relative z-10 max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
                    {stats.map((stat, index) => {
                        const Icon = iconMap[stat.icon] || MapPin;

                        return (
                            <motion.div
                                key={stat.label}
                                className="group relative rounded-3xl p-10 border transition-all duration-500 hover:-translate-y-3 text-center"
                                style={{
                                    background: 'rgba(255,255,255,0.82)',
                                    backdropFilter: 'blur(20px)',
                                    borderColor: 'rgba(0,61,165,0.12)',
                                    boxShadow: '0 4px 30px rgba(0,0,0,0.06)',
                                }}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.15 }}
                                whileHover={{ boxShadow: index % 2 === 0 ? '0 20px 60px rgba(59,130,246,0.25)' : '0 20px 60px rgba(255,107,53,0.25)' }}
                            >
                                {/* Icon */}
                                <div
                                    className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                                    style={{ background: 'rgba(0,61,165,0.08)', border: '1px solid rgba(0,61,165,0.12)' }}
                                >
                                    <Icon size={40} className="text-[#003DA5]" />
                                </div>

                                {/* Animated Number */}
                                <div className="text-6xl font-bold mb-3" style={{ color: '#003DA5' }}>
                                    <AnimatedCounter targetValue={stat.value} />
                                </div>

                                {/* Label */}
                                <p className="text-xl font-medium" style={{ color: '#475569' }}>
                                    {stat.label}
                                </p>

                                {/* Subtle glow effect on hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl" />
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
