/* How-it-works section for the landing page — the three steps drawn as stops on a transit line */
import React from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { Bus } from 'lucide-react';

interface HowItWorksProps {
    steps: Array<{
        number: number;
        title: string;
        description: string;
        icon: string;
    }>;
}

export default function HowItWorks({ steps }: HowItWorksProps) {
    return (
        <section className="py-24 relative">
            <MotionConfig reducedMotion="user">
                <div className="max-w-6xl mx-auto px-6">
                    {/* Section Header */}
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl sm:text-5xl font-bold text-[#003DA5] mb-4">
                            How It Works
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Get started in three simple steps and never miss your bus again
                        </p>
                    </motion.div>

                    {/* The line: a column of stops on phones, a row on wider screens */}
                    <div className="relative md:grid md:grid-cols-3">
                        {steps.map((step, index) => (
                            <motion.div
                                key={step.number}
                                className="relative flex gap-5 pb-12 last:pb-0 md:flex-col md:items-center md:gap-6 md:pb-0 md:text-center"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.2 }}
                            >
                                {/* Track to the next stop */}
                                {index < steps.length - 1 && (
                                    <div className="absolute bg-[#003DA5] left-[25px] top-7 bottom-0 w-1.5 md:left-1/2 md:top-[25px] md:bottom-auto md:w-full md:h-1.5" />
                                )}

                                {/* The stop */}
                                <div className="relative z-10 w-14 h-14 shrink-0 rounded-full bg-white border-[5px] border-[#003DA5] flex items-center justify-center text-xl font-black text-[#003DA5] shadow-lg shadow-blue-200">
                                    {step.number}
                                </div>

                                <div className="md:px-6">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h3>
                                    <p className="text-lg text-gray-600 leading-relaxed">{step.description}</p>
                                </div>
                            </motion.div>
                        ))}

                        {/* The bus running the line (wide screens only) */}
                        <motion.div
                            className="hidden md:flex absolute top-7 z-20 w-10 h-10 -ml-5 -mt-5 rounded-xl bg-gradient-to-br from-[#003DA5] to-[#0066FF] text-white items-center justify-center shadow-lg shadow-blue-300"
                            animate={{ left: ['16.67%', '83.33%'] }}
                            transition={{ duration: 7, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
                        >
                            <Bus size={22} />
                        </motion.div>
                    </div>
                </div>
            </MotionConfig>
        </section>
    );
}
