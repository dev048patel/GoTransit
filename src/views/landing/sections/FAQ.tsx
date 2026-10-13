/* FAQ section for the landing page — a character and the heading on one side, the questions on the other */
import React, { useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Plus } from 'lucide-react';
import { MARKER_CHARACTERS } from '../../../models/data/markerCharacters';

interface FAQProps {
    faqItems: Array<{
        question: string;
        answer: string;
    }>;
}

const astronaut = MARKER_CHARACTERS.find(c => c.id === 'astronaut')!.src;

export default function FAQ({ faqItems }: FAQProps) {
    /* The first answer starts open, so the section never looks like a list of locked boxes */
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="py-24 relative">
            <MotionConfig reducedMotion="user">
                <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
                    {/* Heading */}
                    <motion.div
                        className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start text-center lg:text-left"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <motion.img
                            src={astronaut}
                            alt=""
                            className="w-24 h-24 mx-auto lg:mx-0 mb-5 drop-shadow-xl"
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <h2 className="text-3xl sm:text-5xl font-bold text-[#003DA5] mb-4">
                            Questions? Answers.
                        </h2>
                        <p className="text-xl text-gray-600">
                            Everything you need to know about Transit Regina
                        </p>
                    </motion.div>

                    {/* Questions */}
                    <div className="lg:col-span-8 border-t border-[#003DA5]/15">
                        {faqItems.map((item, index) => {
                            const isOpen = openIndex === index;

                            return (
                                <motion.div
                                    key={item.question}
                                    className="border-b border-[#003DA5]/15"
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: index * 0.07 }}
                                >
                                    <button
                                        onClick={() => setOpenIndex(isOpen ? null : index)}
                                        aria-expanded={isOpen}
                                        className="group w-full flex items-center gap-5 py-6 text-left"
                                    >
                                        <span className={`text-sm font-black tabular-nums transition-colors ${isOpen ? 'text-[#003DA5]' : 'text-gray-400'}`}>
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <span className={`flex-1 text-lg sm:text-xl font-bold transition-colors group-hover:text-[#003DA5] ${isOpen ? 'text-[#003DA5]' : 'text-gray-900'}`}>
                                            {item.question}
                                        </span>
                                        <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-[#003DA5] text-white rotate-45' : 'bg-white text-[#003DA5] border border-[#003DA5]/20'}`}>
                                            <Plus size={18} />
                                        </span>
                                    </button>

                                    <AnimatePresence initial={false}>
                                        {isOpen && (
                                            <motion.div
                                                className="overflow-hidden"
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <p className="pl-10 pr-12 pb-6 text-lg leading-relaxed text-gray-600">
                                                    {item.answer}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </MotionConfig>
        </section>
    );
}
