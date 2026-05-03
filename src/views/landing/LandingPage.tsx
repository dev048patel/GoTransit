/**
 * LandingPage.tsx — GoTransit Regina  [VIEW — MVC]
 *
 * The transit route network background now lives HERE, behind all sections.
 * Each section is transparent so the shared background shows through.
 *
 * Background layers (bottom to top):
 *  1. Off-white base (#F7F8FA) — paper-map feel
 *  2. Square grid — very subtle, like graph paper
 *  3. Animated SVG transit route network — dark charcoal/navy route lines
 *     with moving bus beacons and pulsing stop markers
 *  4. Sections — fully transparent backgrounds, content floats above the map
 */

import { Link } from 'react-router-dom';
import { useLandingController } from '../../controllers/landing/useLandingController';
import logo from '../../New-Image.jpeg';
import HeroSection from './sections/HeroSection';
import StatsSection from './sections/StatsSection';
import FeaturesCarousel from './sections/FeaturesCarousel';
import HowItWorks from './sections/HowItWorks';
import ProblemSolution from './sections/ProblemSolution';
import ComparisonTable from './sections/ComparisonTable';
import TechnologyTrust from './sections/TechnologyTrust';
import FAQ from './sections/FAQ';
import FinalCTA from './sections/FinalCTA';
import LandingFooter from './sections/LandingFooter';

/* ── Route paths across a wide canvas (1400 × 4000 to span full page height) ── */
const BG_ROUTES = [
    { id: 'bg1', color: '#1a2744', d: 'M -50,150  L 250,100   L 550,210  L 900,130  L 1450,170', dur: 18 },
    { id: 'bg2', color: '#003DA5', d: 'M -50,600  L 200,510   L 480,590  L 780,450  L 1100,530 L 1450,480', dur: 24 },
    { id: 'bg3', color: '#374151', d: 'M 350,-30  L 330,280   L 390,620  L 345,980  L 375,1300 L 350,1700', dur: 30 },
    { id: 'bg4', color: '#003DA5', d: 'M 980,-30  L 1010,350  L 960,720  L 1030,1100 L 985,1500', dur: 26 },
    { id: 'bg5', color: '#1e3a5f', d: 'M -50,1100 L 300,1030  L 650,1140 L 950,1000  L 1300,1080 L 1450,1050', dur: 20 },
    { id: 'bg6', color: '#374151', d: 'M -50,1700 L 280,1620  L 600,1710 L 900,1580  L 1200,1650 L 1450,1610', dur: 22 },
    { id: 'bg7', color: '#003DA5', d: 'M -50,2300 L 350,2220  L 700,2310 L 1000,2180 L 1300,2250 L 1450,2220', dur: 19 },
    { id: 'bg8', color: '#1a2744', d: 'M 180,-30  L 165,450   L 200,950  L 175,1450  L 195,1950 L 180,2500', dur: 35 },
    { id: 'bg9', color: '#374151', d: 'M -50,2900 L 400,2820  L 800,2910 L 1100,2780 L 1450,2840', dur: 21 },
    { id: 'bg10', color: '#003DA5', d: 'M 750,-30  L 770,600   L 730,1200 L 760,1800  L 740,2400 L 755,3000', dur: 40 },
];

const BG_STOPS = [
    { x: 250, y: 100 }, { x: 550, y: 210 }, { x: 900, y: 130 },
    { x: 200, y: 510 }, { x: 480, y: 590 }, { x: 780, y: 450 },
    { x: 350, y: 280 }, { x: 980, y: 350 }, { x: 300, y: 1030 },
    { x: 650, y: 1140 }, { x: 950, y: 1000 }, { x: 165, y: 450 },
    { x: 280, y: 1620 }, { x: 600, y: 1710 }, { x: 900, y: 1580 },
    { x: 350, y: 2220 }, { x: 700, y: 2310 }, { x: 1000, y: 2180 },
    { x: 400, y: 2820 }, { x: 800, y: 2910 }, { x: 1100, y: 2780 },
    { x: 770, y: 600 }, { x: 730, y: 1200 }, { x: 760, y: 1800 },
];

export default function LandingPage() {
    const { hero, stats, features, steps, problemSolutions, faqItems, technologies, testimonials } = useLandingController();

    return (
        <div className="relative min-h-screen" style={{ background: '#F7F8FA' }}>

            {/* ════════════════════════════════════════════════════════
                GLOBAL BACKGROUND — fixed behind ALL sections
                ════════════════════════════════════════════════════════ */}
            <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>

                {/* Layer 1: Square grid (paper-map feel) */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(0,61,165,0.055) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,61,165,0.055) 1px, transparent 1px)
                        `,
                        backgroundSize: '40px 40px',
                    }}
                />

                {/* Layer 2: Transit route SVG network */}
                <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 1400 3200"
                    preserveAspectRatio="xMidYMid slice"
                >
                    {/* Bus icon symbol — reused for every beacon */}
                    <defs>
                        {/* Simple top-down bus silhouette: body 18×10, windows, wheels */}
                        <symbol id="bus-icon" viewBox="-9 -5 18 12" overflow="visible">
                            {/* Body */}
                            <rect x="-8" y="-4" width="16" height="9" rx="2" fill="currentColor" />
                            {/* Front window strip */}
                            <rect x="5" y="-2.5" width="3" height="3" rx="0.8" fill="white" fillOpacity="0.7" />
                            {/* Rear window strip */}
                            <rect x="-7.5" y="-2.5" width="3" height="3" rx="0.8" fill="white" fillOpacity="0.7" />
                            {/* Wheels */}
                            <circle cx="-5" cy="5.2" r="1.6" fill="currentColor" stroke="white" strokeWidth="0.6" />
                            <circle cx="5" cy="5.2" r="1.6" fill="currentColor" stroke="white" strokeWidth="0.6" />
                        </symbol>
                    </defs>

                    {BG_ROUTES.map(r => (
                        <g key={r.id}>
                            {/* Track */}
                            <path d={r.d} fill="none" stroke={r.color} strokeWidth="1.5" strokeOpacity="0.15" />

                            {/* Bus 1 — moving along route */}
                            <g style={{ color: r.color, opacity: 0.55 }}>
                                <use href="#bus-icon" width="18" height="12" x="-9" y="-6">
                                    <animateMotion
                                        dur={`${r.dur}s`}
                                        repeatCount="indefinite"
                                        path={r.d}
                                        rotate="auto"
                                    />
                                </use>
                            </g>

                            {/* Bus 2 — offset */}
                            <g style={{ color: r.color, opacity: 0.38 }}>
                                <use href="#bus-icon" width="14" height="9" x="-7" y="-4.5">
                                    <animateMotion
                                        dur={`${r.dur}s`}
                                        repeatCount="indefinite"
                                        begin={`-${(r.dur / 2).toFixed(1)}s`}
                                        path={r.d}
                                        rotate="auto"
                                    />
                                </use>
                            </g>
                        </g>
                    ))}

                    {/* Stop markers */}
                    {BG_STOPS.map((s, i) => (
                        <g key={i}>
                            <circle cx={s.x} cy={s.y} r="4" fill="white" stroke="#003DA5" strokeWidth="1.5" strokeOpacity="0.35" />
                            <circle cx={s.x} cy={s.y} r="4" fill="none" stroke="#003DA5" strokeWidth="1" strokeOpacity="0.0">
                                <animate
                                    attributeName="r" values="4;16;4"
                                    dur={`${3.5 + (i % 5) * 0.7}s`}
                                    repeatCount="indefinite"
                                />
                                <animate
                                    attributeName="stroke-opacity" values="0.25;0;0.25"
                                    dur={`${3.5 + (i % 5) * 0.7}s`}
                                    repeatCount="indefinite"
                                />
                            </circle>
                        </g>
                    ))}
                </svg>
            </div>

            {/* =========================================================
                PAGE SECTIONS — transparent backgrounds, float above bg
                ========================================================= */}
            {/* =========================================================
                FIXED LOGO — top-left, seamless glassmorphic pill
                ========================================================= */}
            <div className="fixed top-0 left-0 z-50 p-4">
                <Link
                    to="/"
                    className="flex items-center gap-2.5 no-underline px-4 py-2 rounded-full transition-all duration-300 hover:scale-105"
                >
                    <img
                        src={logo}

                        alt="GoTransit Regina"
                        className="w-20 h-20 rounded-xl object-cover"
                    />
                </Link>
            </div>

            <div className="relative" style={{ zIndex: 1 }}>
                <HeroSection
                    headline={hero.headline}
                    subheadline={hero.subheadline}
                    primaryCTA={hero.primaryCTA}
                    trustIndicators={hero.trustIndicators}
                />
                <StatsSection stats={stats} />
                <FeaturesCarousel features={features} />
                <HowItWorks steps={steps} />
                <ProblemSolution problemSolutions={problemSolutions} />
                <ComparisonTable />
                <TechnologyTrust technologies={technologies} />
                <FAQ faqItems={faqItems} />
                <FinalCTA />
                <LandingFooter />
            </div>
        </div>
    );
}
