/**
 * LandingPage.tsx — Transit Regina  [VIEW — MVC]
 *
 * The transit route network background (TransitBackground.tsx) sits behind all sections.
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
import TransitBackground from './TransitBackground';
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

export default function LandingPage() {
    const { hero, stats, features, steps, problemSolutions, faqItems, technologies, testimonials } = useLandingController();

    return (
        <div className="relative min-h-screen" style={{ background: '#F7F8FA' }}>

            {/* ════════════════════════════════════════════════════════
                GLOBAL BACKGROUND — fixed behind ALL sections
                ════════════════════════════════════════════════════════ */}
            <TransitBackground />

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

                        alt="Transit Regina"
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
