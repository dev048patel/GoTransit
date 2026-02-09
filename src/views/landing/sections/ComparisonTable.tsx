import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, AlertTriangle } from 'lucide-react';

interface ComparisonRow {
    feature: string;
    traditional: 'yes' | 'no' | 'partial';
    goTransit: 'yes' | 'no' | 'partial';
}

const comparisonData: ComparisonRow[] = [
    { feature: 'Real-time Tracking', traditional: 'partial', goTransit: 'yes' },
    { feature: 'SMS Notifications', traditional: 'no', goTransit: 'yes' },
    { feature: 'Saved Locations', traditional: 'no', goTransit: 'yes' },
    { feature: 'Detour Alerts', traditional: 'no', goTransit: 'yes' },
    { feature: 'Regina-Specific', traditional: 'no', goTransit: 'yes' },
    { feature: 'Proximity Alerts', traditional: 'no', goTransit: 'yes' },
    { feature: 'Route Planning', traditional: 'yes', goTransit: 'yes' },
    { feature: 'Weather-Aware', traditional: 'no', goTransit: 'yes' },
];

function StatusIcon({ status }: { status: 'yes' | 'no' | 'partial' }) {
    switch (status) {
        case 'yes':
            return (
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", duration: 0.6 }}
                >
                    <Check size={28} className="text-green-500" strokeWidth={3} />
                </motion.div>
            );
        case 'no':
            return (
                <motion.div
                    initial={{ scale: 0, rotate: 180 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", duration: 0.6 }}
                >
                    <X size={28} className="text-red-500" strokeWidth={3} />
                </motion.div>
            );
        case 'partial':
            return (
                <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", duration: 0.6 }}
                >
                    <AlertTriangle size={28} className="text-yellow-500" strokeWidth={2} />
                </motion.div>
            );
    }
}

export default function ComparisonTable() {
    return (
        <section className="py-24 bg-gradient-to-b from-white to-gray-50">
            <div className="max-w-6xl mx-auto px-6">
                {/* Section Header */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-[#003DA5] to-[#FF6B35] bg-clip-text text-transparent">
                        Why GoTransit Regina?
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        See how we compare to traditional transit apps
                    </p>
                </motion.div>

                {/* Comparison Table */}
                <motion.div
                    className="backdrop-blur-xl bg-white/60 rounded-3xl border border-gray-200 overflow-hidden shadow-xl"
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Table Header */}
                    <div className="bg-gradient-to-r from-[#003DA5] to-[#0066FF] text-white grid grid-cols-3 py-6 px-8">
                        <div className="text-lg font-semibold">Feature</div>
                        <div className="text-lg font-semibold text-center">Traditional App</div>
                        <div className="text-lg font-semibold text-center bg-white/10 backdrop-blur-sm rounded-xl py-2">
                            GoTransit Regina ⭐
                        </div>
                    </div>

                    {/* Table Rows */}
                    <div>
                        {comparisonData.map((row, index) => (
                            <motion.div
                                key={row.feature}
                                className={`grid grid-cols-3 py-5 px-8 border-b border-gray-200 last:border-b-0 transition-all duration-300 hover:bg-blue-50/50 ${index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/50'
                                    }`}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                                whileHover={{ x: 4 }}
                            >
                                {/* Feature Name */}
                                <div className="font-medium text-gray-900 flex items-center">
                                    {row.feature}
                                </div>

                                {/* Traditional App Status */}
                                <div className="flex justify-center items-center">
                                    <StatusIcon status={row.traditional} />
                                </div>

                                {/* GoTransit Status */}
                                <div className="flex justify-center items-center relative">
                                    <div className="relative">
                                        <StatusIcon status={row.goTransit} />
                                        {/* Glow effect for GoTransit checkmarks */}
                                        {row.goTransit === 'yes' && (
                                            <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse" />
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Footer Note */}
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 py-6 px-8 text-center">
                        <p className="text-gray-600 text-sm">
                            <span className="font-semibold text-[#003DA5]">GoTransit Regina</span> is specifically designed for Regina's transit system and weather conditions
                        </p>
                    </div>
                </motion.div>

                {/* Legend */}
                <motion.div
                    className="mt-8 flex justify-center gap-8 text-sm text-gray-600"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                >
                    <div className="flex items-center gap-2">
                        <Check size={20} className="text-green-500" />
                        <span>Fully Supported</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={20} className="text-yellow-500" />
                        <span>Limited Support</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <X size={20} className="text-red-500" />
                        <span>Not Available</span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
