/* Final call-to-action section for the landing page — the map characters waiting at the stop */
import React from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { ArrowRight, Map } from 'lucide-react';
import { MARKER_CHARACTERS } from '../../../models/data/markerCharacters';

/* Everyone except the plain blue dot */
const CHARACTERS = MARKER_CHARACTERS.filter(c => c.id !== 'default');

export default function FinalCTA() {
    return (
        <section className="relative py-28">
            <MotionConfig reducedMotion="user">
                <motion.div
                    className="max-w-4xl mx-auto px-6 text-center"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    {/* The characters in line at the stop */}
                    <div className="flex items-end justify-center gap-2 sm:gap-5">
                        {CHARACTERS.map((c, i) => (
                            <motion.img
                                key={c.id}
                                src={c.src}
                                alt={c.label}
                                className="w-14 h-14 sm:w-20 sm:h-20 drop-shadow-lg"
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                            />
                        ))}
                    </div>
                    {/* The curb they stand on */}
                    <div className="mx-auto mt-1 mb-12 h-1.5 max-w-md rounded-full bg-[#003DA5]/20" />

                    <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-5">
                        Ready to Catch <span className="text-[#003DA5]">Your Bus?</span>
                    </h2>

                    <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Join Regina commuters who never miss their bus
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link
                            to="/login"
                            className="group px-10 py-4 bg-[#003DA5] text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 no-underline"
                        >
                            Get Started Free
                            <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                        </Link>

                        <Link
                            to="/map"
                            className="px-10 py-4 bg-white text-[#003DA5] rounded-2xl font-bold text-lg border-2 border-[#003DA5]/20 hover:border-[#003DA5]/50 hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 no-underline"
                        >
                            <Map size={20} />
                            Open Map
                        </Link>
                    </div>

                    <p className="mt-8 text-gray-500">
                        Free to use · Built for Regina bus riders · Independent, not run by the City
                    </p>
                </motion.div>
            </MotionConfig>
        </section>
    );
}
