/**
 * LandingFooter.tsx — GoTransit Regina (Simplified)
 *
 * Clean minimal footer:
 *  - Brand logo + tagline
 *  - A single "Meet the Team" / Connect link → /connect
 *  - Copyright bar
 *
 * No fake Product / Support / Legal link columns.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Github } from 'lucide-react';

export default function LandingFooter() {
    return (
        <footer
            className="relative py-14"
            style={{ borderTop: '1px solid rgba(0,61,165,0.1)' }}
        >
            <div className="max-w-5xl mx-auto px-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">

                    {/* Brand */}
                    <div className="text-center md:text-left">
                        <h3 className="text-2xl font-bold mb-1" style={{ color: '#003DA5' }}>
                            GoTransit Regina
                        </h3>
                        <p className="text-sm" style={{ color: '#64748b' }}>
                            Built by students of University of Regina for Regina commuters.
                        </p>
                    </div>

                    {/* Connect CTA */}
                    <Link
                        to="/connect"
                        className="inline-flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 no-underline"
                        style={{
                            background: '#003DA5',
                            color: 'white',
                            boxShadow: '0 4px 20px rgba(0,61,165,0.25)',
                        }}
                    >
                        <Users size={18} />
                        Meet the Team
                    </Link>
                </div>

                {/* Bottom bar */}
                <div
                    className="mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs"
                    style={{ borderTop: '1px solid rgba(0,0,0,0.06)', color: '#94a3b8' }}
                >
                    <p>© 2026 GoTransit Regina. Built for Regina Commuters 🤟.</p>
                    <p>Powered by Regina Transit · Google Maps · Twilio</p>
                </div>
            </div>
        </footer>
    );
}
