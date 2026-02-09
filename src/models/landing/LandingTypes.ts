// Landing Page Type Definitions (Models)

export interface HeroContent {
    headline: string;
    subheadline: string;
    primaryCTA: string;
    secondaryCTA: string;
    trustIndicators: string[];
}

export interface Stat {
    label: string;
    value: string;
    icon: string;
}

export interface Feature {
    id: string;
    title: string;
    description: string;
    visual: string;
    icon: string;
}

export interface Step {
    number: number;
    title: string;
    description: string;
    icon: string;
}

export interface ProblemSolution {
    problem: string;
    solution: string;
    icon: string;
    title: string;
}

export interface FAQItem {
    question: string;
    answer: string;
}

export interface Technology {
    name: string;
    logo: string;
    description: string;
}

export interface Testimonial {
    quote: string;
    author: string;
    role: string;
}
