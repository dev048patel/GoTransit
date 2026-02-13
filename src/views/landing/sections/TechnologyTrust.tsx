import React from 'react';
import { motion } from 'framer-motion';

interface TechnologyTrustProps {
    technologies: Array<{
        name: string;
        logo: string;
        description: string;
    }>;
}

export default function TechnologyTrust({ technologies }: TechnologyTrustProps) {
    // Technology emoji/icon mappings for visual representation
    const techIcons: { [key: string]: string } = {
        'Google Maps': '🗺️',
        'Regina Transit': '🚌',
        'Twilio': '💬',
        'PostgreSQL': '🗄️'
    };

    return (
        <section className="py-24 bg-white">
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
                        Powered by the Best
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        We combine official Regina Transit data with Google Maps intelligence and reliable Twilio messaging to deliver accurate, real-time information you can trust.
                    </p>
                </motion.div>

                {/* Technology Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {technologies.map((tech, index) => (
                        <motion.div
                            key={tech.name}
                            className="group relative bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-gray-200 hover:border-[#FF6B35]/30 transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_20px_60px_rgba(0,61,165,0.2)]"
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                        >
                            {/* Logo/Icon Container */}
                            <div className="relative w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-500">
                                {/* Icon */}
                                <span className="text-5xl filter grayscale group-hover:grayscale-0 transition-all duration-500">
                                    {techIcons[tech.name] || '⚙️'}
                                </span>

                                {/* Gradient Overlay on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-[#003DA5]/0 to-[#FF6B35]/0 group-hover:from-[#003DA5]/10 group-hover:to-[#FF6B35]/10 transition-all duration-500" />
                            </div>

                            {/* Technology Name */}
                            <h3 className="text-xl font-bold text-gray-900 text-center mb-3">
                                {tech.name}
                            </h3>

                            {/* Description */}
                            <p className="text-gray-600 text-center text-sm leading-relaxed">
                                {tech.description}
                            </p>

                            {/* Hover Glow Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 rounded-3xl transition-all duration-500 -z-10" />
                        </motion.div>
                    ))}
                </div>

                {/* Connection Lines Visual (Desktop Only) */}
                <div className="hidden lg:block relative mt-16">
                    <svg className="w-full h-32 opacity-20" viewBox="0 0 800 100">
                        {/* Dotted connecting lines */}
                        <motion.path
                            d="M 200,50 L 400,20"
                            stroke="url(#gradient1)"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            fill="none"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 2, delay: 0.5 }}
                        />
                        <motion.path
                            d="M 400,20 L 600,50"
                            stroke="url(#gradient1)"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            fill="none"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 2, delay: 0.7 }}
                        />
                        <defs>
                            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#003DA5" />
                                <stop offset="100%" stopColor="#FF6B35" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                {/* Trust Badge */}
                <motion.div
                    className="mt-12 text-center"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 1 }}
                >
                    <p className="text-gray-500 text-lg">
                        ✓ Secure • ✓ Reliable • ✓ Real-time
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
