import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Bell, Heart, AlertTriangle, Calendar, Map } from 'lucide-react';

interface FeaturesCarouselProps {
    features: Array<{
        id: string;
        title: string;
        description: string;
        visual: string;
        icon: string;
    }>;
}

const iconMap: { [key: string]: React.FC<{ size?: number, className?: string }> } = {
    Navigation,
    Bell,
    Heart,
    AlertTriangle,
    Calendar,
    Map
};

export default function FeaturesCarousel({ features }: FeaturesCarouselProps) {
    const [activeFeature, setActiveFeature] = useState(0);

    return (
        <section className="py-24 bg-gradient-to-b from-white to-blue-50">
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
                        Powerful Features
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Everything you need for a stress-free commute in Regina
                    </p>
                </motion.div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    {/* Tab Navigation (30%) */}
                    <div className="lg:col-span-4 space-y-4">
                        {features.map((feature, index) => {
                            const Icon = iconMap[feature.icon] || Map;
                            const isActive = activeFeature === index;

                            return (
                                <motion.button
                                    key={feature.id}
                                    className={`w-full text-left p-6 rounded-2xl transition-all duration-300 border-l-4 ${isActive
                                            ? 'bg-gradient-to-r from-[#FF6B35]/20 to-transparent border-[#FF6B35] shadow-[0_0_30px_rgba(255,107,53,0.3)]'
                                            : 'bg-white/50 border-transparent hover:bg-white/80 hover:border-gray-200'
                                        }`}
                                    onClick={() => setActiveFeature(index)}
                                    whileHover={{ x: 8 }}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: index * 0.1 }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive
                                                ? 'bg-gradient-to-br from-[#003DA5] to-[#0066FF] text-white'
                                                : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            <Icon size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={`font-bold text-lg mb-1 ${isActive ? 'text-gray-900' : 'text-gray-700'
                                                }`}>
                                                {feature.title}
                                            </h3>
                                            <p className={`text-sm ${isActive ? 'text-gray-600' : 'text-gray-500'
                                                }`}>
                                                {feature.description.split('.')[0]}.
                                            </p>
                                        </div>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Content Area (70%) */}
                    <div className="lg:col-span-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeFeature}
                                className="relative"
                                initial={{ opacity: 0, x: 50, rotateY: -10 }}
                                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.5 }}
                                style={{ perspective: 1000 }}
                            >
                                {/* Phone Mockup */}
                                <div className="relative mx-auto" style={{ maxWidth: '400px' }}>
                                    {/* Phone Frame */}
                                    <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-[3rem] p-3 shadow-[0_40px_100px_rgba(0,0,0,0.3)]">
                                        {/* Notch */}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-gray-900 rounded-b-3xl z-10" />

                                        {/* Screen */}
                                        <div className="relative h-[650px] bg-white rounded-[2.5rem] overflow-hidden">
                                            {/* Feature Screenshot Placeholder */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-8">
                                                <div className="text-center">
                                                    <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                                        {React.createElement(iconMap[features[activeFeature].icon] || Map, {
                                                            size: 48,
                                                            className: "text-white"
                                                        })}
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                                        {features[activeFeature].title}
                                                    </h3>
                                                    <p className="text-gray-600 leading-relaxed">
                                                        {features[activeFeature].description}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Glowing Shadow */}
                                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-500/30 blur-3xl rounded-full" />
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
}
