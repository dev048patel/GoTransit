/* Technology section for the landing page — one slim strip naming what the app runs on */
import React from 'react';
import { motion } from 'framer-motion';
import { Map, Bus, Database } from 'lucide-react';

interface TechnologyTrustProps {
    technologies: Array<{
        name: string;
        logo: string;
        description: string;
    }>;
}

const iconMap: { [name: string]: React.FC<{ size?: number }> } = {
    'Google Maps': Map,
    'Regina Transit': Bus,
    'PostgreSQL': Database,
};

export default function TechnologyTrust({ technologies }: TechnologyTrustProps) {
    return (
        <section className="py-14 relative">
            <motion.div
                className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <span className="text-sm font-bold uppercase tracking-widest text-gray-500">Powered by</span>

                {technologies.map(tech => {
                    const Icon = iconMap[tech.name] || Database;

                    return (
                        <div
                            key={tech.name}
                            className="flex items-center gap-3 rounded-full bg-white/80 border border-gray-200 pl-2 pr-5 py-2 shadow-sm"
                        >
                            <span className="w-10 h-10 rounded-full bg-blue-50 text-[#003DA5] flex items-center justify-center">
                                <Icon size={20} />
                            </span>
                            <span className="text-left">
                                <span className="block text-sm font-bold text-gray-900">{tech.name}</span>
                                <span className="block text-xs text-gray-500">{tech.description}</span>
                            </span>
                        </div>
                    );
                })}
            </motion.div>
        </section>
    );
}
