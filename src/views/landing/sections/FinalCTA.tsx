import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Map } from 'lucide-react';

export default function FinalCTA() {
    return (
        <section className="relative py-32 overflow-hidden bg-gradient-to-br from-[#003DA5] via-[#003DA5] to-[#0066FF]">
            {/* Animated Background Shapes */}
            <div className="absolute inset-0 overflow-hidden opacity-30">
                <motion.div
                    className="absolute top-20 left-20 w-96 h-96 bg-white/20 rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.2, 1],
                        x: [0, 50, 0],
                        y: [0, -30, 0],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.3, 1],
                        x: [0, -60, 0],
                        y: [0, 40, 0],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                {/* Content */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                        Ready to Transform Your Commute?
                    </h2>

                    <p className="text-2xl md:text-3xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed">
                        Join Regina commuters who never miss their bus
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                        <Link
                            to="/login"
                            className="group px-12 py-5 bg-white text-[#003DA5] rounded-2xl font-bold text-xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_rgba(0,0,0,0.4)] hover:scale-105 hover:-translate-y-2 transition-all duration-300 flex items-center gap-3 no-underline"
                        >
                            Get Started Free
                            <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                        </Link>

                        <Link
                            to="/map"
                            className="px-12 py-5 bg-white/10 backdrop-blur-md text-white rounded-2xl font-bold text-xl border-2 border-white/30 hover:bg-white/20 hover:border-white/50 transition-all duration-300 flex items-center gap-3 no-underline"
                        >
                            <Map size={22} />
                            Open Map
                        </Link>
                    </div>

                    {/* Trust Badge */}
                    <p className="mt-10 text-white/70 text-lg">
                        ✓ Free to use • ✓ No credit card required • ✓ Setup in 2 minutes
                    </p>
                </motion.div>
            </div>

            {/* Decorative Bottom Wave */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
        </section>
    );
}
