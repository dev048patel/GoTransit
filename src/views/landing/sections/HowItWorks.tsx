import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Bell, Bus } from 'lucide-react';

interface HowItWorksProps {
    steps: Array<{
        number: number;
        title: string;
        description: string;
        icon: string;
    }>;
}

const iconMap: { [key: string]: React.FC<{ size?: number, className?: string }> } = {
    MapPin,
    Bell,
    Bus
};

export default function HowItWorks({ steps }: HowItWorksProps) {
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
                    <h2 className="text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-[#003DA5] to-[#FF6B35] bg-clip-text text-transparent">
                        How It Works
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Get started in three simple steps and never miss your bus again
                    </p>
                </motion.div>

                {/* Steps Container */}
                <div className="relative flex flex-col md:flex-row gap-8 items-center justify-between">
                    {steps.map((step, index) => {
                        const Icon = iconMap[step.icon] || MapPin;

                        return (
                            <React.Fragment key={step.number}>
                                {/* Step Card */}
                                <motion.div
                                    className="relative flex-1 bg-white rounded-3xl p-10 shadow-[0_20px_80px_rgba(0,0,0,0.08)] hover:shadow-[0_25px_100px_rgba(0,0,0,0.12)] transition-all duration-500"
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: index * 0.2 }}
                                >
                                    {/* Number Badge */}
                                    <div className="absolute -top-7 left-8 w-14 h-14 rounded-full bg-gradient-to-br from-[#003DA5] to-[#0066FF] flex items-center justify-center text-white text-2xl font-bold shadow-[0_8px_24px_rgba(0,61,165,0.4)]">
                                        {step.number}
                                    </div>

                                    {/* Icon */}
                                    <div className="w-20 h-20 mx-auto mb-6 mt-4 rounded-2xl bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
                                        <Icon size={40} className="text-[#003DA5]" />
                                    </div>

                                    {/* Content */}
                                    <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                                        {step.title}
                                    </h3>
                                    <p className="text-gray-600 text-center leading-relaxed">
                                        {step.description}
                                    </p>
                                </motion.div>

                                {/* Connector Line (desktop only) */}
                                {index < steps.length - 1 && (
                                    <div className="hidden md:block relative w-24 h-1">
                                        {/* Gradient Line */}
                                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-[#003DA5] to-[#FF6B35] rounded-full" />

                                        {/* Animated Dot */}
                                        <motion.div
                                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#FF6B35] rounded-full shadow-lg"
                                            animate={{
                                                x: [0, 84, 0],
                                            }}
                                            transition={{
                                                duration: 3,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
