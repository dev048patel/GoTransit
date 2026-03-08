import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Bell, Heart, AlertTriangle, Calendar, Map } from 'lucide-react';

/* ── App screenshots for each feature ── */
import ssRealTime from '../../../SS01.png';
import ssRouteSelect from '../../../SS02.png';
import ssRouteTrack from '../../../SS03.png';
import ssRoutePlanner from '../../../SS04.png';
import ssSavedStops from '../../../SS06.png';

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

/* Map feature IDs to their screenshot + mockup type */
const screenshotMap: { [key: string]: { src: string; mockup: 'laptop' | 'phone' } } = {
    'real-time': { src: ssRealTime, mockup: 'laptop' },
    'sms-alerts': { src: ssRealTime, mockup: 'laptop' },      // placeholder until notification is built
    'saved-stops': { src: ssSavedStops, mockup: 'phone' },
    'route-planner': { src: ssRoutePlanner, mockup: 'phone' },
};

const defaultScreenshot = { src: ssRealTime, mockup: 'laptop' as const };

/* ── Phone Mockup ── */
function PhoneMockup({ src, alt }: { src: string; alt: string }) {
    return (
        <div className="relative mx-auto" style={{ maxWidth: '320px' }}>
            <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-[2.5rem] p-2.5 shadow-[0_30px_80px_rgba(0,0,0,0.3)]">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-900 rounded-b-2xl z-10" />
                {/* Screen */}
                <div className="relative rounded-[2rem] overflow-hidden bg-white" style={{ aspectRatio: '9 / 17' }}>
                    <img
                        src={src}
                        alt={alt}
                        className="w-full h-full object-contain object-top"
                    />
                </div>
            </div>
            {/* Glowing Shadow */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-16 bg-blue-500/20 blur-3xl rounded-full" />
        </div>
    );
}

/* ── Laptop Mockup ── */
function LaptopMockup({ src, alt }: { src: string; alt: string }) {
    return (
        <div className="relative mx-auto" style={{ maxWidth: '680px' }}>
            <div className="relative bg-gradient-to-b from-gray-700 to-gray-800 rounded-xl shadow-[0_30px_80px_rgba(0,0,0,0.25)] overflow-hidden">
                {/* Browser Toolbar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/90 border-b border-gray-700">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="flex-1 mx-3">
                        <div className="bg-gray-900/60 rounded-md px-3 py-1.5 text-xs text-gray-400 font-mono flex items-center gap-2">
                            <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            gotransitregina.ca
                        </div>
                    </div>
                </div>
                {/* Screen */}
                <div className="relative" style={{ aspectRatio: '16 / 9.5' }}>
                    <img
                        src={src}
                        alt={alt}
                        className="w-full h-full object-cover object-center"
                    />
                </div>
            </div>
            {/* Laptop Base */}
            <div className="relative mx-auto mt-0" style={{ width: '110%', marginLeft: '-5%' }}>
                <div className="h-4 bg-gradient-to-b from-gray-600 to-gray-700 rounded-b-xl mx-auto" style={{ width: '80%' }} />
                <div className="h-1.5 bg-gray-700 rounded-b-lg mx-auto" style={{ width: '40%' }} />
            </div>
            {/* Glowing Shadow */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-blue-500/20 blur-3xl rounded-full" />
        </div>
    );
}

export default function FeaturesCarousel({ features }: FeaturesCarouselProps) {
    const [activeFeature, setActiveFeature] = useState(0);

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
                    <h2 className="text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-[#003DA5] to-[#003DA5] bg-clip-text text-transparent">
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
                                        ? 'bg-white border-[#003DA5] shadow-lg shadow-blue-100'
                                        : 'bg-white/70 border-transparent hover:bg-white hover:border-gray-200 hover:shadow-md'
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
                    <div className="lg:col-span-8 flex items-center justify-center min-h-[500px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeFeature}
                                className="relative w-full"
                                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                                transition={{ duration: 0.5 }}
                            >
                                {(() => {
                                    const current = screenshotMap[features[activeFeature].id] || defaultScreenshot;
                                    const alt = features[activeFeature].title;

                                    return current.mockup === 'phone'
                                        ? <PhoneMockup src={current.src} alt={alt} />
                                        : <LaptopMockup src={current.src} alt={alt} />;
                                })()}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
}
