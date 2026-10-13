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
        <section className="py-16 relative">
            <div className="max-w-5xl mx-auto px-6">
                {/* One open strip, so the map behind stays in view */}
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#003DA5]/15">
                    {stats.map((stat, index) => {
                        const Icon = iconMap[stat.icon] || Route;

                        return (
                            <motion.div
                                key={stat.label}
                                className="flex flex-col items-center text-center px-6 py-6"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.12 }}
                            >
                                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#003DA5]/70 mb-2">
                                    <Icon size={16} />
                                    {stat.label}
                                </div>
                                <div className="text-6xl md:text-7xl font-black text-[#003DA5] tabular-nums">
                                    <AnimatedCounter targetValue={stat.value} />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
