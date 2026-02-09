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

    return (
        <div ref={ref}>
            {formattedCount}{suffix}
        </div>
    );
}

export default function StatsSection({ stats }: StatsSectionProps) {
    return (
        <section className="py-20 bg-gradient-to-b from-[#FF6B35] to-[#003DA5]">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {stats.map((stat, index) => {
                        const Icon = iconMap[stat.icon] || MapPin;

                        return (
                            <motion.div
                                key={stat.label}
                                className="group relative backdrop-blur-xl bg-white/10 rounded-3xl p-10 border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-3"
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.15 }}
                                whileHover={{
                                    rotateX: 5,
                                    boxShadow: '0 20px 60px rgba(0, 61, 165, 0.3)',
                                }}
                                style={{ perspective: 1000 }}
                            >
                                {/* Icon with gradient background */}
                                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform duration-300">
                                    <Icon size={40} className="text-white" />
                                </div>

                                {/* Animated Number */}
                                <div className="text-6xl font-bold text-white mb-3 bg-gradient-to-r from-white via-blue-100 to-orange-200 bg-clip-text text-transparent">
                                    <AnimatedCounter targetValue={stat.value} />
                                </div>

                                {/* Label */}
                                <p className="text-xl text-white/90 font-medium">
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
