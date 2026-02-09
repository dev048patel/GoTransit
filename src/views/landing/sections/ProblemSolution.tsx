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

export default function ProblemSolution({ problemSolutions }: ProblemSolutionProps) {
    return (
        <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="max-w-7xl mx-auto px-6">
                {/* Section Header */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-5xl font-bold text-gray-900 mb-4">
                        Built for Regina's Real Challenges
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        We understand the unique difficulties of commuting in Regina
                    </p>
                </motion.div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {problemSolutions.map((item, index) => {
                        const Icon = iconMap[item.icon] || Clock;

                        return (
                            <motion.div
                                key={item.title}
                                className="group relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-[32px] p-10 overflow-hidden hover:scale-105 transition-all duration-500"
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.15 }}
                                whileHover={{
                                    boxShadow: '0 30px 100px rgba(255, 107, 53, 0.3)',
                                }}
                            >
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B35]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                {/* Icon */}
                                <motion.div
                                    className="relative w-28 h-28 mx-auto mb-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center"
                                    animate={{
                                        y: [0, -10, 0],
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B35] to-[#0066FF] rounded-full blur-2xl opacity-50" />
                                    <Icon size={56} className="relative text-white" />
                                </motion.div>

                                {/* Title */}
                                <h3 className="text-2xl font-bold text-white mb-6 text-center">
                                    {item.title}
                                </h3>

                                {/* Problem */}
                                <div className="mb-6">
                                    <p className="text-sm font-semibold text-red-400 mb-2">❌ Problem:</p>
                                    <p className="text-gray-300 italic leading-relaxed">
                                        "{item.problem}"
                                    </p>
                                </div>

                                {/* Solution */}
                                <div>
                                    <p className="text-sm font-semibold text-green-400 mb-2">✅ Solution:</p>
                                    <p className="text-white font-medium leading-relaxed">
                                        "{item.solution}"
                                    </p>
                                </div>

                                {/* Decorative Element */}
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br from-[#FF6B35]/20 to-transparent rounded-full blur-3xl" />
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
