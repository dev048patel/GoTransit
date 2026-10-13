/* Problem/solution section for the landing page — each rider complaint answered by a map character */
import React from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { MARKER_CHARACTERS, type MarkerCharacterId } from '../../../models/data/markerCharacters';
import { CHARACTER_THEMES } from '../../../models/data/characterThemes';

interface ProblemSolutionProps {
    problemSolutions: Array<{
        problem: string;
        solution: string;
        icon: string;
        title: string;
    }>;
}

/* Who answers each complaint, in order (the penguin takes the cold one) */
const GUIDES: MarkerCharacterId[] = ['penguin', 'robot', 'astronaut'];

export default function ProblemSolution({ problemSolutions }: ProblemSolutionProps) {
    return (
        <section className="py-24 relative">
            <MotionConfig reducedMotion="user">
                <div className="max-w-4xl mx-auto px-6">
                    {/* Section Header */}
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl sm:text-5xl font-bold mb-5" style={{ color: '#0f172a' }}>
                            Built for Regina's{' '}
                            <span style={{ color: '#003DA5' }}>Real Challenges</span>
                        </h2>
                        <p className="text-xl max-w-2xl mx-auto" style={{ color: '#64748b' }}>
                            We understand the unique difficulties of commuting in Regina
                        </p>
                    </motion.div>

                    {/* One short conversation per problem, stepping left and right down the page */}
                    <div className="space-y-14">
                        {problemSolutions.map((item, index) => {
                            const id = GUIDES[index % GUIDES.length];
                            const guide = MARKER_CHARACTERS.find(c => c.id === id)!;
                            const theme = CHARACTER_THEMES[id];

                            return (
                                <motion.div
                                    key={item.title}
                                    className={`max-w-2xl ${index % 2 === 1 ? 'md:ml-auto' : ''}`}
                                    initial={{ opacity: 0, x: index % 2 === 1 ? 40 : -40 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true, margin: '-80px' }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                                        {item.title}
                                    </p>

                                    {/* The rider */}
                                    <div className="flex justify-end mb-3">
                                        <p className="max-w-md rounded-2xl rounded-br-sm bg-white border border-gray-200 px-5 py-3 text-gray-600 italic shadow-sm">
                                            {item.problem}
                                        </p>
                                    </div>

                                    {/* The character's answer, in its own colours */}
                                    <div className="flex items-end gap-3">
                                        <motion.img
                                            src={guide.src}
                                            alt={guide.label}
                                            className="w-20 h-20 shrink-0 drop-shadow-lg"
                                            animate={{ y: [0, -6, 0] }}
                                            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
                                        />
                                        <p
                                            className="max-w-md rounded-2xl rounded-bl-sm border px-5 py-4 text-lg font-semibold shadow-md"
                                            style={{ background: theme.primarySoft, color: theme.primaryDark, borderColor: theme.border }}
                                        >
                                            {item.solution}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </MotionConfig>
        </section>
    );
}
