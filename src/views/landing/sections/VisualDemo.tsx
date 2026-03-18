/* Visual demo section for the landing page — animated screenshot slideshow of the app in action */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── App screenshots for demo steps ── */
import ssMapOverview from '../../../SS01.png';
import ssRouteSelect from '../../../SS02.png';
import ssRouteTrack from '../../../SS03.png';
import ssRoutePlanner from '../../../SS04.png';

const demoSteps = [
    { id: 1, title: 'Open App', description: 'Launch GoTransit Regina', screenshot: ssRouteSelect },
    { id: 2, title: 'View Map', description: 'See nearby buses in real-time', screenshot: ssMapOverview },
    { id: 3, title: 'Track Bus', description: 'Watch your bus approach', screenshot: ssRouteTrack },
    { id: 4, title: 'Plan Route', description: 'Get route suggestions', screenshot: ssRoutePlanner },
    { id: 5, title: 'Board Bus', description: 'Arrive at stop on time', screenshot: ssMapOverview },
];

export default function VisualDemo() {
    const [currentStep, setCurrentStep] = useState(0);

    // Auto-play demo
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStep((prev) => (prev + 1) % demoSteps.length);
        }, 3000); // Change step every 3 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <section className="py-24 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0">
                <motion.div
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.2, 1],
                        x: [0, 50, 0],
                        y: [0, -30, 0],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.3, 1],
                        x: [0, -40, 0],
                        y: [0, 40, 0],
                    }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6">
                {/* Section Header */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-5xl font-bold text-gray-900 mb-4">
                        See It In Action
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Watch how easy it is to track your bus and never miss a ride
                    </p>
                </motion.div>

                {/* Laptop / Browser Mockup */}
                <div className="relative mx-auto mb-12" style={{ maxWidth: '750px' }}>
                    {/* Browser Window Frame */}
                    <div className="relative bg-gradient-to-b from-gray-700 to-gray-800 rounded-xl shadow-[0_30px_80px_rgba(0,0,0,0.25)] overflow-hidden">
                        {/* Browser Toolbar */}
                        <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/90 border-b border-gray-700">
                            {/* Window Controls */}
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                            </div>
                            {/* URL Bar */}
                            <div className="flex-1 mx-3">
                                <div className="bg-gray-900/60 rounded-md px-3 py-1.5 text-xs text-gray-400 font-mono flex items-center gap-2">
                                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    gotransitregina.ca
                                </div>
                            </div>
                        </div>

                        {/* Screen Content */}
                        <div className="relative" style={{ aspectRatio: '16 / 9.5' }}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    className="absolute inset-0"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    {/* Screenshot */}
                                    <img
                                        src={demoSteps[currentStep].screenshot}
                                        alt={demoSteps[currentStep].title}
                                        className="w-full h-full object-cover object-center"
                                    />
                                    {/* Step Label Overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-5 pt-12">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-lg font-bold border border-white/30">
                                                {demoSteps[currentStep].id}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">
                                                    {demoSteps[currentStep].title}
                                                </h3>
                                                <p className="text-sm text-white/80">
                                                    {demoSteps[currentStep].description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
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

                {/* Step Indicators */}
                <div className="flex justify-center gap-3">
                    {demoSteps.map((step, index) => (
                        <button
                            key={step.id}
                            className={`transition-all duration-300 rounded-full ${index === currentStep
                                ? 'w-12 h-3 bg-gradient-to-r from-[#003DA5] to-[#003DA5]'
                                : 'w-3 h-3 bg-gray-300 hover:bg-gray-400'
                                }`}
                            onClick={() => setCurrentStep(index)}
                            aria-label={`Go to step ${step.id}`}
                        />
                    ))}
                </div>

                {/* Auto-play indicator */}
                <p className="text-center mt-6 text-gray-500 text-sm">
                    Auto-playing • Click dots to navigate
                </p>
            </div>
        </section>
    );
}
