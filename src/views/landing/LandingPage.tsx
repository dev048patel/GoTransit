import React from 'react';
import { useLandingController } from '../../controllers/landing/useLandingController';
import HeroSection from './sections/HeroSection';
import StatsSection from './sections/StatsSection';
import FeaturesCarousel from './sections/FeaturesCarousel';
import HowItWorks from './sections/HowItWorks';
import ProblemSolution from './sections/ProblemSolution';
import VisualDemo from './sections/VisualDemo';
import ComparisonTable from './sections/ComparisonTable';
import TechnologyTrust from './sections/TechnologyTrust';
import FAQ from './sections/FAQ';
import FinalCTA from './sections/FinalCTA';
import LandingFooter from './sections/LandingFooter';

export default function LandingPage() {
    // Controller: Handles logic and state
    const { hero, stats, features, steps, problemSolutions, faqItems, technologies, testimonials } = useLandingController();

    // View: Renders the UI with data from the controller
    return (
        <div className="min-h-screen">
            <HeroSection
                headline={hero.headline}
                subheadline={hero.subheadline}
                primaryCTA={hero.primaryCTA}
                secondaryCTA={hero.secondaryCTA}
                trustIndicators={hero.trustIndicators}
            />

            <StatsSection stats={stats} />

            <FeaturesCarousel features={features} />

            <HowItWorks steps={steps} />

            <VisualDemo />

            <ProblemSolution problemSolutions={problemSolutions} />

            <ComparisonTable />

            <TechnologyTrust technologies={technologies} />

            <FAQ faqItems={faqItems} />

            <FinalCTA />

            <LandingFooter />
        </div>
    );
}
