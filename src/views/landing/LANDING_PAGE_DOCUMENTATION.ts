/**
 * LANDING PAGE DOCUMENTATION
 * ==========================
 *
 * This document provides comprehensive documentation for all landing page components,
 * their purposes, and how they're used in the GoTransit Regina application.
 *
 * ARCHITECTURE: MVC Pattern
 * -------------------------
 * Models: TypeScript interfaces defining data structures
 * Views: React components for presentation
 * Controllers: Custom hooks for state management
 *
 * LOCATION: http://localhost:3000/landing
 */

// ============================================================================
// MODELS (Data Structures)
// ============================================================================

/**
 * File: src/models/landing/LandingTypes.ts
 * Purpose: Define TypeScript interfaces for all landing page data
 *
 * Interfaces:
 * -----------
 * - HeroContent: Hero section content (headline, CTAs, trust indicators)
 * - Stat: Statistical metrics (label, value, icon)
 * - Feature: Feature descriptions (title, description, visual, icon)
 * - Step: Process steps (number, title, description, icon)
 * - ProblemSolution: Problem/solution pairs (problem, solution, icon, title)
 * - FAQItem: FAQ questions and answers
 * - Technology: Technology partner information (name, logo, description)
 * - Testimonial: User testimonials (quote, author, role)
 *
 * Used by: All landing page components for type safety
 */

// ============================================================================
// CONTROLLER (State Management)
// ============================================================================

/**
 * File: src/controllers/landing/useLandingController.ts
 * Purpose: Provide centralized data management for landing page
 *
 * Returns:
 * --------
 * - hero: HeroContent - Hero section data
 * - stats: Stat[] - Statistics for metrics cards
 * - features: Feature[] - 6 features for carousel
 * - steps: Step[] - 3 steps for "How It Works"
 * - problemSolutions: ProblemSolution[] - 3 problem/solution pairs
 * - faqItems: FAQItem[] - 6 FAQ items
 * - technologies: Technology[] - 4 technology partners
 * - testimonials: Testimonial[] - 3 user testimonials
 *
 * Data Source: src/data/mock/landingMockData.ts
 * Used by: LandingPage.tsx (main view)
 */

// ============================================================================
// VIEWS (Components)
// ============================================================================

/**
 * 1. LandingPage.tsx
 * ------------------
 * Parent component that assembles all landing sections
 *
 * Location: src/views/landing/LandingPage.tsx
 * Route: /landing
 * Dependencies: All section components, useLandingController
 *
 * Sections (in order):
 * - HeroSection
 * - StatsSection
 * - FeaturesCarousel
 * - HowItWorks
 * - VisualDemo
 * - ProblemSolution
 * - ComparisonTable
 * - TechnologyTrust
 * - FAQ
 * - FinalCTA
 * - LandingFooter
 */

/**
 * 2. HeroSection.tsx
 * ------------------
 * Premium hero section with animated gradient background
 *
 * Location: src/views/landing/sections/HeroSection.tsx
 *
 * Features:
 * - Animated mesh gradient background (blue → purple → orange)
 * - 3 floating gradient orbs with parallax animations
 * - Glassmorphic content card with backdrop blur
 * - Gradient text headline
 * - 3D-tilted phone mockup with perspective transform
 * - Premium CTA buttons with hover effects
 * - Trust indicators (badges)
 *
 * Props:
 * - headline: string - Main headline text
 * - subheadline: string - Supporting text
 * - primaryCTA: string - Primary button text
 * - secondaryCTA: string - Secondary button text
 * - trustIndicators: string[] - Trust badges
 *
 * Animations: Framer Motion
 * - Orbs: Continuous floating animation
 * - Content: Staggered fade-in on load
 * - Phone: 3D rotation reveal
 */

/**
 * 3. StatsSection.tsx
 * -------------------
 * Animated statistics cards with counters
 *
 * Location: src/views/landing/sections/StatsSection.tsx
 *
 * Features:
 * - 3 glassmorphic metric cards
 * - CountUp animations from 0 to target numbers
 * - 3D tilt effect on hover
 * - Gradient backgrounds and icons
 * - Glowing effects
 *
 * Props:
 * - stats: Stat[] - Array of statistics to display
 *
 * Components:
 * - AnimatedCounter: Internal component for number animations
 *   - Extracts numeric value from strings
 *   - Animates from 0 to target over 2 seconds
 *   - Uses intersection observer for scroll triggers
 *
 * Animations: Framer Motion + Custom counter logic
 * - Cards: Fade up on scroll, 3D rotation on hover
 * - Numbers: CountUp animation when in viewport
 */

/**
 * 4. FeaturesCarousel.tsx
 * -----------------------
 * Interactive feature showcase with vertical tabs
 *
 * Location: src/views/landing/sections/FeaturesCarousel.tsx
 *
 * Features:
 * - Vertical tab navigation (30% width)
 * - Large phone mockup preview (70% width)
 * - 6 features displayed
 * - Smooth transitions between features
 * - Active tab highlighting
 *
 * Props:
 * - features: Feature[] - Array of 6 features
 *
 * State:
 * - activeFeature: number - Currently selected feature index
 *
 * Layout:
 * - Desktop: Side-by-side tabs + phone
 * - Mobile: Stacked vertically (could be enhanced with swipe)
 *
 * Animations: Framer Motion
 * - Tab switch: Phone rotates and fades
 * - Hover: Tab slides right
 */

/**
 * 5. HowItWorks.tsx
 * -----------------
 * 3-step timeline showing process
 *
 * Location: src/views/landing/sections/HowItWorks.tsx
 *
 * Features:
 * - Horizontal timeline (desktop) / Vertical (mobile)
 * - Animated connector lines with moving gradient dots
 * - Number badges with gradient backgrounds
 * - Float-up animations on scroll
 *
 * Props:
 * - steps: Step[] - Array of 3 process steps
 *
 * Visual Elements:
 * - Number badges: Absolute positioned circles
 * - Connector lines: Gradient lines with animated dots
 * - Cards: White background with shadow
 * - Icons: Displayed in gradient containers
 *
 * Animations: Framer Motion + CSS
 * - Cards: Staggered fade-up on scroll
 * - Dots: Continuous movement along gradient path
 */

/**
 * 6. VisualDemo.tsx
 * -----------------
 * Auto-playing demonstration of app usage
 *
 * Location: src/views/landing/sections/VisualDemo.tsx
 *
 * Features:
 * - Large centered phone mockup (500px height)
 * - Auto-playing 5-step animation
 * - Progress dots indicating current step
 * - Clickable navigation
 * - Radial gradient background
 *
 * State:
 * - currentStep: number - Current demo step (0-4)
 *
 * Auto-play:
 * - Changes step every 3 seconds
 * - Loops infinitely
 * - Can be interrupted by clicking dots
 *
 * Steps:
 * 1. Open App
 * 2. View Map
 * 3. Track Bus
 * 4. Get Notified
 * 5. Board Bus
 *
 * Animations: Framer Motion
 * - Content: 3D rotation fade between steps
 * - Indicator: Animated dot showing progress
 */

/**
 * 7. ProblemSolution.tsx
 * ----------------------
 * Dark bento grid showcasing solutions to common problems
 *
 * Location: src/views/landing/sections/ProblemSolution.tsx
 *
 * Features:
 * - 3 dark gradient cards
 * - Animated floating icons
 * - Clear problem/solution distinction
 * - Hover tilt effects
 *
 * Props:
 * - problemSolutions: ProblemSolution[] - Array of 3 problem/solution pairs
 *
 * Cards:
 * 1. Freezing at the Stop (Snowflake icon)
 * 2. Detour Confusion (Construction icon)
 * 3. Schedule Uncertainty (Clock icon)
 *
 * Design:
 * - Background: Dark gradient (#1a1a2e to #16213e)
 * - Icons: Large, floating, gradient glow
 * - Text: Red for problems, Green for solutions
 *
 * Animations: Framer Motion
 * - Cards: Fade-up on scroll, scale on hover
 * - Icons: Continuous floating motion
 * - Gradient: Appears on hover
 */

/**
 * 8. ComparisonTable.tsx
 * ----------------------
 * Feature comparison matrix vs traditional apps
 *
 * Location: src/views/landing/sections/ComparisonTable.tsx
 *
 * Features:
 * - Glassmorphic table styling
 * - 8 feature comparisons
 * - Animated checkmark/X/warning icons
 * - Highlighted GoTransit column
 * - Row hover effects
 *
 * Features Compared:
 * - Real-time Tracking
 * - SMS Notifications
 * - Saved Locations
 * - Detour Alerts
 * - Regina-Specific
 * - Proximity Alerts
 * - Route Planning
 * - Weather-Aware
 *
 * Icon System:
 * - ✅ Check: Fully supported (green)
 * - ⚠️ Warning: Limited support (yellow)
 * - ❌ X: Not available (red)
 *
 * Animations: Framer Motion
 * - Icons: Spring animation on appear
 * - Rows: Slide right on hover
 */

/**
 * 9. TechnologyTrust.tsx
 * ----------------------
 * Technology partner badges
 *
 * Location: src/views/landing/sections/TechnologyTrust.tsx
 *
 * Features:
 * - 4 technology cards
 * - Grayscale → color on hover
 * - Animated connector lines (desktop)
 * - Trust badges
 *
 * Props:
 * - technologies: Technology[] - Array of 4 technologies
 *
 * Technologies:
 * 1. Google Maps - Accurate mapping
 * 2. Regina Transit - Official GTFS data
 * 3. Twilio - SMS gateway
 * 4. PostgreSQL - Data storage
 *
 * Visual:
 * - Icons: Large emoji representations
 * - Effect: Grayscale filter removed on hover
 * - Connections: SVG paths with gradient
 *
 * Animations: Framer Motion + SVG
 * - Cards: Lift on hover
 * - Lines: Path drawing animation
 */

/**
 * 10. FAQ.tsx
 * -----------
 * Expandable FAQ accordion
 *
 * Location: src/views/landing/sections/FAQ.tsx
 *
 * Features:
 * - 6 FAQ items
 * - Glassmorphic accordion styling
 * - Smooth expand/collapse animations
 * - Plus/X icon rotation
 * - Hover effects
 *
 * Props:
 * - faqItems: FAQItem[] - Array of 6 questions/answers
 *
 * State:
 * - openIndex: number | null - Currently open accordion item
 *
 * Questions:
 * 1. Is GoTransit Regina free to use?
 * 2. How accurate is real-time tracking?
 * 3. Will SMS alerts cost money?
 * 4. Can I use without an account?
 * 5. What happens if my route has a detour?
 * 6. Does this work offline?
 *
 * Animations: Framer Motion
 * - Icon: Rotates 45° (Plus → X)
 * - Content: Height auto-animation
 * - Item: Fade-up on scroll
 */

/**
 * 11. FinalCTA.tsx
 * ----------------
 * Dramatic final call-to-action
 *
 * Location: src/views/landing/sections/FinalCTA.tsx
 *
 * Features:
 * - Radial gradient background
 * - Animated floating shapes
 * - Large prominent CTA buttons
 * - Trust badges
 *
 * CTAs:
 * - Primary: "Start Using GoTransit" (white button)
 * - Secondary: "Learn More" (glass button)
 *
 * Background:
 * - Gradient: Orange → Blue
 * - Shapes: Animated circles with blur
 * - Transition: Fades to footer
 *
 * Animations: Framer Motion
 * - Shapes: Continuous floating motion
 * - Content: Fade-up on scroll
 * - Buttons: Lift and glow on hover
 */

/**
 * 12. LandingFooter.tsx
 * ---------------------
 * Sophisticated dark footer
 *
 * Location: src/views/landing/sections/LandingFooter.tsx
 *
 * Features:
 * - 4-column grid layout
 * - Social media icons
 * - Link hover animations
 * - Brand gradient text
 *
 * Columns:
 * 1. Product (Features, How It Works, Pricing, Testimonials)
 * 2. Support (Help Center, Contact, Report Issue, Status)
 * 3. Legal (Privacy, Terms, Cookies, Licenses)
 * 4. Connect (About, Blog, Careers, Press)
 *
 * Social:
 * - Facebook, Twitter, Instagram, Mail
 * - Circular icon buttons
 * - Hover color change to orange
 *
 * Design:
 * - Background: Very dark (#0a0a0f)
 * - Links: Gray with orange hover
 * - Bottom bar: Copyright and powered by
 */

// ============================================================================
// DATA (Mock Content)
// ============================================================================

/**
 * File: src/data/mock/landingMockData.ts
 * Purpose: Provide all static content for landing page
 *
 * Exports:
 * --------
 * - heroContent: HeroContent - Hero section data
 * - stats: Stat[] - 3 statistics
 * - features: Feature[] - 6 features
 * - steps: Step[] - 3 process steps
 * - problemSolutions: ProblemSolution[] - 3 problem/solution pairs
 * - faqItems: FAQItem[] - 6 FAQ items
 * - technologies: Technology[] - 4 tech partners
 * - testimonials: Testimonial[] - 3 testimonials
 *
 * Content Strategy:
 * -----------------
 * - Regina-specific language (mentions -40°C weather)
 * - Focuses on real commuter problems
 * - Benefits-driven, not feature-list
 * - Relatable tone, not corporate
 */

// ============================================================================
// ROUTING
// ============================================================================

/**
 * File: src/App.tsx (updated)
 *
 * Route Configuration:
 * --------------------
 * Path: /landing
 * Component: LandingPage
 * Access: Public (no authentication required)
 *
 * Other Routes:
 * - / : MapView (main app)
 * - /admin : AdminLayout (admin dashboard)
 */

// ============================================================================
// DEPENDENCIES
// ============================================================================

/**
 * Key Libraries:
 * --------------
 * 1. framer-motion@^10.x
 *    - All page animations
 *    - Scroll-triggered animations
 *    - 3D transforms
 *
 * 2. lucide-react@^0.x
 *    - All icons throughout landing page
 *    - Navigation, Bell, Heart, Map, etc.
 *
 * 3. react-intersection-observer@^9.x
 *    - Scroll-triggered animations
 *    - Counter animations when in viewport
 *
 * 4. embla-carousel-react@^8.x
 *    - Ready for future carousel enhancements
 *    - Currently not actively used
 */

// ============================================================================
// PERFORMANCE NOTES
// ============================================================================

/**
 * Optimization Strategies:
 * ------------------------
 * 1. Lazy Loading: Images below fold should be lazy loaded
 * 2. Code Splitting: Heavy sections could be split
 * 3. Animation Performance:
 *    - Use transform/opacity only (GPU accelerated)
 *    - Avoid animating width/height/top/left
 * 4. Debouncing: Scroll events are debounced
 * 5. Intersection Observer: Only animate when in viewport
 */

// ============================================================================
// RESPONSIVE DESIGN
// ============================================================================

/**
 * Breakpoints:
 * ------------
 * - Mobile: < 640px
 *   - Single column layouts
 *   - Stacked sections
 *   - Larger touch targets
 *
 * - Tablet: 640px - 1024px
 *   - 2-column grids
 *   - Condensed spacing
 *
 * - Desktop: > 1024px
 *   - Full multi-column layouts
 *   - Maximum width: 1400px container
 *   - Generous spacing (120px between sections)
 */

// ============================================================================
// COLOR SYSTEM
// ============================================================================

/**
 * Primary Colors:
 * ---------------
 * - Brand Blue: #003DA5 (Regina Transit inspired)
 * - Secondary Blue: #0066FF
 * - Accent Orange: #FF6B35
 * - Dark: #0a0a0f (footer)
 *
 * Gradients:
 * ----------
 * - Hero: linear-gradient(135deg, #003DA5, #0066FF, #FF6B35)
 * - Card: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))
 * - Button: linear-gradient(135deg, #FF6B35, #FF8C42)
 * - Text: linear-gradient(to right, #003DA5, #0066FF, #FF6B35)
 */

// ============================================================================
// ACCESSIBILITY
// ============================================================================

/**
 * A11y Features:
 * --------------
 * - ARIA labels on all interactive elements
 * - Keyboard navigation support
 * - Focus indicators on buttons/links
 * - Alt text for images
 * - High contrast text (WCAG AA compliant)
 * - Semantic HTML structure
 */

// ============================================================================
// FUTURE ENHANCEMENTS
// ============================================================================

/**
 * Potential Improvements:
 * -----------------------
 * 1. Add testimonials carousel
 * 2. Implement actual phone screenshots
 * 3. Add video demo instead of step animation
 * 4. Create interactive map preview
 * 5. Add live user count (if backend provides)
 * 6. Implement dark mode toggle
 * 7. Add language selection (English/French)
 * 8. Create mobile app download links
 */
