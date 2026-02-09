import React from 'react';
import { Facebook, Twitter, Instagram, Mail } from 'lucide-react';

export default function LandingFooter() {
    const footerLinks = {
        Product: ['Features', 'How It Works', 'Pricing', 'Testimonials'],
        Support: ['Help Center', 'Contact Us', 'Report an Issue', 'Status'],
        Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Licenses'],
        Connect: ['About Us', 'Blog', 'Careers', 'Press Kit']
    };

    return (
        <footer className="bg-[#0a0a0f] text-white pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-6">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
                    {/* Brand Column */}
                    <div className="lg:col-span-1">
                        <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-orange-400 bg-clip-text text-transparent mb-4">
                            GoTransit
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Built by students of University of Regina for Regina commuters. Never miss your bus again.
                        </p>

                        {/* Social Icons */}
                        <div className="flex gap-4 mt-6">
                            {[Facebook, Twitter, Instagram, Mail].map((Icon, index) => (
                                <a
                                    key={index}
                                    href="#"
                                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-[#FF6B35] transition-all duration-300"
                                >
                                    <Icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link Columns */}
                    {Object.entries(footerLinks).map(([category, links]) => (
                        <div key={category}>
                            <h4 className="font-semibold text-white mb-4">{category}</h4>
                            <ul className="space-y-3">
                                {links.map((link) => (
                                    <li key={link}>
                                        <a
                                            href="#"
                                            className="text-gray-400 hover:text-[#FF6B35] hover:translate-x-1 inline-block transition-all duration-300"
                                        >
                                            {link}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500 text-sm text-center md:text-left">
                        © 2026 GoTransit Regina. Built with ❤️ for Regina commuters.
                    </p>
                    <p className="text-gray-500 text-sm text-center md:text-right">
                        Powered by Regina Transit • Google Maps • Twilio
                    </p>
                </div>
            </div>
        </footer>
    );
}
