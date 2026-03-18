/* Landing page controller — aggregates mock data for all landing page sections */
import { heroContent, stats, features, steps, problemSolutions, faqItems, technologies, testimonials } from '../../models/data/mock/landingMockData';

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
