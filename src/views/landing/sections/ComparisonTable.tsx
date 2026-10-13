/* Comparison section for the landing page — a printed schedule beside Transit Regina, row by row */
import React from 'react';
import { motion } from 'framer-motion';
import { Navigation, Clock, AlertTriangle, Map, Heart, Smile, Check, X } from 'lucide-react';

const ROWS = [
    { icon: Navigation, what: 'Where your bus is right now', paper: 'Not shown', app: 'Live on the map' },
    { icon: Clock, what: 'When it reaches your stop', paper: 'Planned time only', app: 'Live arrival estimate' },
    { icon: AlertTriangle, what: 'When the bus runs late', paper: 'You find out at the stop', app: 'See where it really is' },
    { icon: Map, what: 'Trips with a transfer', paper: 'Work it out yourself', app: 'Fastest route found for you' },
    { icon: Heart, what: 'Your regular places', paper: 'Look them up every time', app: 'Saved in the app' },
    { icon: Smile, what: 'A fox on your map', paper: 'Sadly, no', app: 'Fox, robot, penguin and more' },
];

export default function ComparisonTable() {
    return (
        <section className="py-24 relative">
            <div className="max-w-5xl mx-auto px-6">
                {/* Section Header */}
                <motion.div
                    className="text-center mb-14"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-5">
                        Why <span className="text-[#003DA5]">Transit Regina?</span>
                    </h2>
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                        A printed schedule tells you the plan. Transit Regina shows you what is actually happening.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                >
                    {/* Column names (wide screens; on phones each cell carries its own label) */}
                    <div className="hidden md:grid grid-cols-[1.25fr_1fr_1.15fr]">
                        <div />
                        <div className="px-6 pb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Printed schedule</div>
                        <div className="px-6 py-4 rounded-t-3xl bg-[#003DA5] text-sm font-bold uppercase tracking-widest text-white">Transit Regina</div>
                    </div>

                    {ROWS.map(({ icon: Icon, what, paper, app }, i) => (
                        <div
                            key={what}
                            className="grid grid-cols-2 md:grid-cols-[1.25fr_1fr_1.15fr] mb-4 md:mb-0 rounded-2xl md:rounded-none overflow-hidden md:overflow-visible border border-slate-200 md:border-0 bg-white/80 md:bg-transparent"
                        >
                            <div className="col-span-2 md:col-span-1 flex items-center gap-3 px-4 md:px-2 py-3 md:py-5 font-bold text-slate-900 md:border-t md:border-slate-200">
                                <span className="w-9 h-9 shrink-0 rounded-xl bg-blue-50 text-[#003DA5] flex items-center justify-center">
                                    <Icon size={18} />
                                </span>
                                {what}
                            </div>

                            <div className="flex items-center gap-2 px-4 md:px-6 py-3 md:py-5 text-slate-500 md:border-t md:border-slate-200">
                                <X size={18} className="shrink-0 text-slate-400" />
                                <span>
                                    <span className="block md:hidden text-[10px] font-bold uppercase tracking-wider text-slate-400">Printed schedule</span>
                                    {paper}
                                </span>
                            </div>

                            <div className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-5 bg-[#003DA5] text-white font-semibold md:border-t md:border-white/15 ${i === ROWS.length - 1 ? 'md:rounded-b-3xl' : ''}`}>
                                <Check size={18} strokeWidth={3} className="shrink-0 text-green-300" />
                                <span>
                                    <span className="block md:hidden text-[10px] font-bold uppercase tracking-wider text-white/60">Transit Regina</span>
                                    {app}
                                </span>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
