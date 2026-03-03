/**
 * ConnectPage.tsx — GoTransit Regina
 *
 * Developer showcase page accessible at /connect.
 * Shows each team member's name, role, photo, and LinkedIn link
 * so visitors can easily connect with the builders.
 *
 * Update the `developers` array below with your real details.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Linkedin, ArrowLeft, Github } from 'lucide-react';

interface Developer {
    name: string;
    role: string;
    bio: string;
    linkedin: string;
    github?: string;
    /* Use a URL or leave as empty string to show initials avatar */
    photo: string;
}

/* ── UPDATE THIS ARRAY with real team details ── */
const developers: Developer[] = [
    {
        name: 'Dev Patel',
        role: 'Backend & Application Security Engineer',
        bio: 'Computer Science student at University of Regina. Passionate about building tools that improve everyday life.',
        linkedin: 'https://www.linkedin.com/in/dev-patel-itsme/',
        github: 'https://github.com/dev048patel',
        photo: '',
    },
    // Add more developers here ↓
    {
      name: 'Nirjar Patel',
      role: 'QA Analyst & Application Architect',
      bio: 'Computer Science student at University of Regina. Passionate about building tools that improve everyday life.',
      linkedin: 'https://www.linkedin.com/in/nirjarpatel/',
      github: 'https://github.com/nirjar1012',
      photo: '',
    },
];

function Avatar({ name, photo }: { name: string; photo: string }) {
    if (photo) {
        return (
            <img
                src={photo}
                alt={name}
                className="w-28 h-28 rounded-full object-cover ring-4 ring-white shadow-lg"
            />
        );
    }
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return (
        <div
            className="w-28 h-28 rounded-full flex items-center justify-center text-2xl font-bold text-white ring-4 ring-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #003DA5, #0066FF)' }}
        >
            {initials}
        </div>
    );
}

export default function ConnectPage() {
    return (
        <div className="min-h-screen relative" style={{ background: '#F7F8FA' }}>

            {/* Same grid background as the landing page */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(0,61,165,0.055) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0,61,165,0.055) 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px',
                    zIndex: 0,
                }}
            />

            <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">

                {/* Back link */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-12"
                >
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-sm font-medium no-underline transition-colors"
                        style={{ color: '#003DA5' }}
                    >
                        <ArrowLeft size={16} />
                        Back to Home
                    </Link>
                </motion.div>

                {/* Header */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-5xl font-bold mb-4" style={{ color: '#0f172a' }}>
                        Meet the <span style={{ color: '#003DA5' }}>Team</span>
                    </h1>
                    <p className="text-xl max-w-xl mx-auto" style={{ color: '#64748b' }}>
                        We're students at the University of Regina who built GoTransit to make commuting less painful.
                        Reach out — we'd love to connect.
                    </p>
                </motion.div>

                {/* Developer cards */}
                <div className={`grid gap-8 ${developers.length === 1 ? 'max-w-sm mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {developers.map((dev, i) => (
                        <motion.div
                            key={dev.name}
                            className="rounded-3xl p-8 text-center"
                            style={{
                                background: 'rgba(255,255,255,0.85)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(0,61,165,0.1)',
                                boxShadow: '0 8px 40px rgba(0,61,165,0.08)',
                            }}
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: i * 0.15 }}
                            whileHover={{ y: -6, boxShadow: '0 20px 60px rgba(0,61,165,0.14)' }}
                        >
                            {/* Avatar */}
                            <div className="flex justify-center mb-5">
                                <Avatar name={dev.name} photo={dev.photo} />
                            </div>

                            {/* Name & role */}
                            <h2 className="text-2xl font-bold mb-1" style={{ color: '#0f172a' }}>{dev.name}</h2>
                            <p className="text-sm font-medium mb-4" style={{ color: '#003DA5' }}>{dev.role}</p>

                            {/* Bio */}
                            <p className="text-sm leading-relaxed mb-6" style={{ color: '#64748b' }}>{dev.bio}</p>

                            {/* Links */}
                            <div className="flex justify-center gap-3">
                                <a
                                    href={dev.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm no-underline transition-all duration-200 hover:scale-105"
                                    style={{ background: '#003DA5', color: 'white' }}
                                >
                                    <Linkedin size={16} />
                                    LinkedIn
                                </a>
                                {dev.github && (
                                    <a
                                        href={dev.github}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm no-underline transition-all duration-200 hover:scale-105"
                                        style={{ background: 'rgba(0,61,165,0.08)', color: '#003DA5', border: '1px solid rgba(0,61,165,0.2)' }}
                                    >
                                        <Github size={16} />
                                        GitHub
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Footer note */}
                <p className="text-center text-sm mt-14" style={{ color: '#94a3b8' }}>
                    © 2026 GoTransit Regina · Built at the University of Regina
                </p>
            </div>
        </div>
    );
}
