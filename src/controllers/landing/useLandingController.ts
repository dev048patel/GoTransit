// This file is 

import { heroContent, stats, features, steps, problemSolutions, faqItems, technologies, testimonials } from '../../data/mock/landingMockData';

export function useLandingController() {
    return {
        hero: heroContent,
        stats,
        features,
        steps,
        problemSolutions,
        faqItems,
        technologies,
        testimonials
    };
}
