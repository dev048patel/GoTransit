import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const demoSteps = [
    { id: 1, title: 'Open App', description: 'Launch GoTransit Regina' },
    { id: 2, title: 'View Map', description: 'See nearby buses in real-time' },
    { id: 3, title: 'Track Bus', description: 'Watch your bus approach' },
    { id: 4, title: 'Get Notified', description: 'Receive SMS alert' },
    { id: 5, title: 'Board Bus', description: 'Arrive at stop on time' }
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
        <section className="py-24 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 relative overflow-hidden">
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

                {/* Phone Mockup */}
                <div className="relative mx-auto mb-12" style={{ maxWidth: '500px' }}>
                    <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-[3.5rem] p-4 shadow-[0_50px_120px_rgba(0,0,0,0.4)]">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-8 bg-gray-900 rounded-b-3xl z-10" />

                        {/* Screen */}
                        <div className="relative h-[700px] bg-white rounded-[3rem] overflow-hidden">
                            {/* Animated Content */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-12"
                                    initial={{ opacity: 0, scale: 0.9, rotateY: 90 }}
                                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, rotateY: -90 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <div className="text-center">
                                        {/* Step Number */}
                                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#003DA5] to-[#0066FF] flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                            {demoSteps[currentStep].id}
                                        </div>

                                        {/* Step Title */}
                                        <h3 className="text-3xl font-bold text-gray-900 mb-4">
                                            {demoSteps[currentStep].title}
                                        </h3>

                                        {/* Step Description */}
                                        <p className="text-xl text-gray-600">
                                            {demoSteps[currentStep].description}
                                        </p>

                                        {/* Animation Indicator */}
                                        <motion.div
                                            className="w-16 h-16 mx-auto mt-8 rounded-full border-4 border-[#FF6B35] border-t-transparent"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        />
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Radial Glow */}
                    <div className="absolute -inset-20 bg-gradient-radial from-blue-500/20 via-transparent to-transparent blur-3xl -z-10" />
                </div>

                {/* Step Indicators */}
                <div className="flex justify-center gap-3">
                    {demoSteps.map((step, index) => (
                        <button
                            key={step.id}
                            className={`transition-all duration-300 rounded-full ${index === currentStep
                                    ? 'w-12 h-3 bg-gradient-to-r from-[#003DA5] to-[#FF6B35]'
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
