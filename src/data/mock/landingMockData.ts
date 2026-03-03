// Mock Data for Landing Page
import { HeroContent, Stat, Feature, Step, ProblemSolution, FAQItem, Technology, Testimonial } from '../../models/landing/LandingTypes';

export const heroContent: HeroContent = {
    headline: "Never Miss Your Bus Again",
    subheadline: "Real-time bus tracking, personalized alerts, and smart route planning—all designed for Regina's unpredictable weather and transit schedules.",
    primaryCTA: "Get Started Free",
    secondaryCTA: "Watch Demo",
    trustIndicators: [
        "Built for Regina Transit riders",
        "Free to use",
        "Real-time tracking",
        "SMS alerts"
    ]
};

export const stats: Stat[] = [
    {
        label: "Regina Routes Covered",
        value: "22",
        icon: "Route"
    },
    {
        label: "Bus Stops Mapped",
        value: "1,400+",
        icon: "MapPin"
    },
    {
        label: "On-time Accuracy",
        value: "88%",
        icon: "Target"
    }
];

export const features: Feature[] = [
    {
        id: "real-time",
        title: "See Your Bus in Real-Time",
        description: "Track your bus's exact location before and during your journey. No more guessing games—watch it approach your stop in real-time, even in -40°C Regina winters.",
        visual: "bus-tracking-mockup.png",
        icon: "Navigation"
    },
    {
        id: "sms-alerts",
        title: "Smart SMS Alerts",
        description: "Get automated text messages when your bus is exactly 3-5 stops away. Time your departure perfectly—no more freezing at the bus stop.",
        visual: "sms-notification-mockup.png",
        icon: "Bell"
    },
    {
        id: "saved-stops",
        title: "Personalized Stop Mapping",
        description: "Name your frequent stops for instant access. Your daily commute, simplified with one tap.",
        visual: "saved-stops-mockup.png",
        icon: "Heart"
    },
    {
        id: "route-planner",
        title: "Smart Route Planner",
        description: "Enter your destination and we'll find the fastest route—whether it's one bus or three transfers. Works with your current GPS location or any address.",
        visual: "route-planner-mockup.png",
        icon: "Map"
    }
];

export const steps: Step[] = [
    {
        number: 1,
        title: "Save Your Stops",
        description: "Mark your home, work, school, or any frequent destination",
        icon: "MapPin"
    },
    {
        number: 2,
        title: "Get Smart Alerts",
        description: "Receive SMS when your bus is approaching—3 to 5 stops away",
        icon: "Bell"
    },
    {
        number: 3,
        title: "Never Miss Your Ride",
        description: "Leave at the perfect time, track your journey, and arrive stress-free",
        icon: "Bus"
    }
];

export const problemSolutions: ProblemSolution[] = [
    {
        title: "Freezing at the Stop",
        problem: "Waiting outside in -30°C because you don't know when the bus will arrive",
        solution: "Get SMS alerts so you leave your warm house at the perfect time",
        icon: "Snowflake"
    },
    {
        title: "Late & Out of the Loop",
        problem: "Static schedules show planned times but never actual delays or bus positions",
        solution: "Live bus tracking on your phone shows exactly where your bus is right now",
        icon: "Construction"
    },
    {
        title: "Schedule Uncertainty",
        problem: "Delays and changes that static schedules don't reflect",
        solution: "Live tracking shows exactly where your bus is, not where it should be",
        icon: "Clock"
    }
];

export const faqItems: FAQItem[] = [
    {
        question: "Is GoTransit Regina free to use?",
        answer: "Yes! Core features including real-time tracking and SMS alerts are completely free."
    },
    {
        question: "How accurate is the real-time tracking?",
        answer: "We use official GTFS-Realtime data from Regina Transit combined with GPS tracking for the most accurate locations."
    },
    {
        question: "Will SMS alerts cost me money?",
        answer: "Standard text messaging rates from your carrier may apply, but our service is free."
    },
    {
        question: "Can I use this without creating an account?",
        answer: "You need to sign in with Google OAuth to personalize your experience and receive SMS alerts."
    },
    {
        question: "What happens if my bus is delayed?",
        answer: "Live tracking shows the real-time position of your bus so you always know if it's running late — no more relying on static schedules."
    },
    {
        question: "Does this work offline?",
        answer: "You need an internet connection for real-time data, but saved stops and schedules are cached locally."
    }
];

export const technologies: Technology[] = [
    {
        name: "Google Maps",
        logo: "google-maps-logo.svg",
        description: "Accurate mapping and route data"
    },
    {
        name: "Regina Transit",
        logo: "regina-transit-logo.svg",
        description: "Official GTFS real-time data"
    },
    {
        name: "Twilio",
        logo: "twilio-logo.svg",
        description: "Reliable SMS gateway"
    },
    {
        name: "PostgreSQL",
        logo: "postgresql-logo.svg",
        description: "Secure data storage"
    }
];

export const testimonials: Testimonial[] = [
    {
        quote: "I used to show up 10 minutes early just to be safe. Now I get there exactly on time every single day.",
        author: "Sarah",
        role: "University Student"
    },
    {
        quote: "The SMS alerts are a game-changer in winter. I stay inside until the last possible moment.",
        author: "Mike",
        role: "Downtown Commuter"
    },
    {
        quote: "Finally, an app that actually understands how Regina Transit works.",
        author: "Priya",
        role: "Daily Rider"
    }
];
