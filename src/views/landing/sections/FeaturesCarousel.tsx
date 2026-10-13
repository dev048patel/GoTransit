/* Features carousel section for the landing page — animated cards showcasing app capabilities */
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useIsPresent, useReducedMotion } from 'framer-motion';
import { Navigation, Bell, Heart, AlertTriangle, Calendar, Map, Clock, MapPin, Smile } from 'lucide-react';
import { MARKER_CHARACTERS, type MarkerCharacterId } from '../../../models/data/markerCharacters';
import { CHARACTER_THEMES } from '../../../models/data/characterThemes';
import { CHARACTER_VOICE } from '../../../models/data/characterVoice';

import { MapDemo, ArrivalsDemo, StopTapDemo, PlannerDemo } from './FeatureDemos';

interface FeaturesCarouselProps {
    features: Array<{
        id: string;
        title: string;
        description: string;
        visual: string;
        icon: string;
    }>;
}

const iconMap: { [key: string]: React.FC<{ size?: number, className?: string }> } = {
    Navigation,
    Bell,
    Heart,
    AlertTriangle,
    Calendar,
    Map,
    Clock,
    MapPin,
    Smile
};

/* What each feature shows, and in which frame.
   To play a recorded clip instead of the drawn demo, import the file and add `video: clip` to the entry. */
interface Showcase { Demo: React.FC; mockup: 'laptop' | 'phone'; video?: string }

const showcaseMap: { [key: string]: Showcase } = {
    'real-time': { Demo: MapDemo, mockup: 'laptop' },
    'live-arrival': { Demo: ArrivalsDemo, mockup: 'phone' },
    'stop-arrivals': { Demo: StopTapDemo, mockup: 'phone' },
    'route-planner': { Demo: PlannerDemo, mockup: 'phone' },
};

const defaultShowcase: Showcase = { Demo: MapDemo, mockup: 'laptop' };

/* How long a demo stays up before the next feature starts (a clip runs for its own length) */
const STILL_MS = 6000;

interface ClipProps {
    video: string;
    alt: string;
    paused: boolean;
    onProgress: (fraction: number) => void;
}

/* ── A recorded clip inside a mockup ── */
function Clip({ video, alt, paused, onProgress }: ClipProps) {
    const ref = useRef<HTMLVideoElement>(null);
    /* False while this feature is fading out, so its clip stops reporting progress */
    const isPresent = useIsPresent();

    useEffect(() => {
        if (paused || !isPresent) ref.current?.pause();
        else ref.current?.play().catch(() => { /* autoplay refused: the photo stays up */ });
    }, [paused, isPresent]);

    return (
        <video
            ref={ref}
            src={video}
            aria-label={alt}
            className="w-full h-full object-cover object-top"
            muted
            playsInline
            preload="metadata"
            onTimeUpdate={e => onProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
            onEnded={() => onProgress(1)}
        />
    );
}

/* The characters a rider can pick (everything except the plain blue dot) */
const CHARACTERS = MARKER_CHARACTERS.filter(c => c.id !== 'default');
const CHARACTERS_FEATURE = 'characters';

/* ── Character picker: the same colours and words the map screens use for each character ── */
function CharacterPreview({ selected, onPick }: { selected: MarkerCharacterId; onPick: (id: MarkerCharacterId) => void }) {
    const character = CHARACTERS.find(c => c.id === selected) ?? CHARACTERS[0];
    const theme = CHARACTER_THEMES[character.id];
    const voice = CHARACTER_VOICE[character.id];

    return (
        <div className="relative mx-auto" style={{ maxWidth: '420px' }}>
            <div
                className="rounded-3xl border p-6 shadow-[0_30px_80px_rgba(0,0,0,0.18)] transition-colors duration-500"
                style={{ background: theme.surface, borderColor: theme.border }}
            >
                {/* The picked character and what it says while it works */}
                <div className="flex items-center gap-4 mb-5">
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={character.id}
                            src={character.src}
                            alt={character.label}
                            className="w-24 h-24 drop-shadow-lg"
                            initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ duration: 0.25 }}
                        />
                    </AnimatePresence>
                    <div
                        className="flex-1 rounded-2xl rounded-bl-sm px-4 py-3 text-sm font-medium transition-colors duration-500"
                        style={{ background: theme.primarySoft, color: theme.primaryDark }}
                    >
                        {voice.searching}
                    </div>
                </div>

                {/* A sample route card in this character's colours */}
                <div
                    className="rounded-2xl border p-4 mb-5 transition-colors duration-500"
                    style={{ background: theme.surface2, borderColor: theme.borderSoft }}
                >
                    <span
                        className="inline-block rounded-full border px-3 py-1 text-xs font-bold mb-3 transition-colors duration-500"
                        style={{ background: theme.accentSoft, color: theme.accentDark, borderColor: theme.accentBorder }}
                    >
                        ★ {voice.recommended}
                    </span>
                    <div className="flex items-center justify-between">
                        <span
                            className="rounded-full px-4 py-1.5 text-sm font-bold text-white transition-colors duration-500"
                            style={{ background: theme.primary }}
                        >
                            Route 3
                        </span>
                        <span className="text-lg font-bold" style={{ color: theme.primaryDark }}>~12 min</span>
                    </div>
                </div>

                {/* The choices */}
                <div className="flex justify-between">
                    {CHARACTERS.map(c => (
                        <button
                            key={c.id}
                            onClick={() => onPick(c.id)}
                            aria-label={c.label}
                            aria-pressed={c.id === character.id}
                            className="rounded-2xl p-2 border-2 transition-all duration-300 hover:scale-110"
                            style={c.id === character.id
                                ? { background: theme.chip, borderColor: theme.primary }
                                : { background: 'transparent', borderColor: 'transparent' }}
                        >
                            <img src={c.src} alt="" className="w-11 h-11" />
                        </button>
                    ))}
                </div>
            </div>
            {/* Glowing Shadow */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-16 bg-blue-500/20 blur-3xl rounded-full" />
        </div>
    );
}

/* ── Phone Mockup ── */
function PhoneMockup({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative mx-auto" style={{ maxWidth: '320px' }}>
            <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-[2.5rem] p-2.5 shadow-[0_30px_80px_rgba(0,0,0,0.3)]">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-900 rounded-b-2xl z-10" />
                {/* Screen */}
                <div className="relative rounded-[2rem] overflow-hidden bg-white" style={{ aspectRatio: '9 / 17' }}>
                    {children}
                </div>
            </div>
            {/* Glowing Shadow */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-16 bg-blue-500/20 blur-3xl rounded-full" />
        </div>
    );
}

/* ── Laptop Mockup ── */
function LaptopMockup({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative mx-auto" style={{ maxWidth: '680px' }}>
            <div className="relative bg-gradient-to-b from-gray-700 to-gray-800 rounded-xl shadow-[0_30px_80px_rgba(0,0,0,0.25)] overflow-hidden">
                {/* Browser Toolbar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/90 border-b border-gray-700">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="flex-1 mx-3">
                        <div className="bg-gray-900/60 rounded-md px-3 py-1.5 text-xs text-gray-400 font-mono flex items-center gap-2">
                            <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            transitregina.ca
                        </div>
                    </div>
                </div>
                {/* Screen */}
                <div className="relative" style={{ aspectRatio: '16 / 9.5' }}>
                    {children}
                </div>
            </div>
            {/* Laptop Base */}
            <div className="relative mx-auto mt-0" style={{ width: '110%', marginLeft: '-5%' }}>
                <div className="h-4 bg-gradient-to-b from-gray-600 to-gray-700 rounded-b-xl mx-auto" style={{ width: '80%' }} />
                <div className="h-1.5 bg-gray-700 rounded-b-lg mx-auto" style={{ width: '40%' }} />
            </div>
            {/* Glowing Shadow */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-blue-500/20 blur-3xl rounded-full" />
        </div>
    );
}

export default function FeaturesCarousel({ features }: FeaturesCarouselProps) {
    const [activeFeature, setActiveFeature] = useState(0);
    /* How far through the active feature we are, 0 to 1 */
    const [progress, setProgress] = useState(0);
    const [hovered, setHovered] = useState(false);
    /* The character a visitor clicked; until they click, the characters take turns */
    const [pickedCharacter, setPickedCharacter] = useState<MarkerCharacterId | null>(null);
    /* People who have asked for less motion choose the feature themselves */
    const reducedMotion = useReducedMotion();
    const paused = hovered || !!reducedMotion || pickedCharacter !== null;

    const current = showcaseMap[features[activeFeature].id] || defaultShowcase;

    const showFeature = (index: number) => {
        setActiveFeature(index);
        setProgress(0);
        setPickedCharacter(null);
    };

    /* A demo is timed here; a clip reports its own progress */
    useEffect(() => {
        if (paused || current.video) return;
        const timer = setInterval(() => setProgress(p => p + 100 / STILL_MS), 100);
        return () => clearInterval(timer);
    }, [paused, current.video, activeFeature]);

    useEffect(() => {
        if (progress >= 1) showFeature((activeFeature + 1) % features.length);
    });

    return (
        <section id="features" className="py-24 relative scroll-mt-8">
            <div className="max-w-7xl mx-auto px-6">
                {/* Section Header */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-[#003DA5] to-[#003DA5] bg-clip-text text-transparent">
                        Powerful Features
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Everything you need for a stress-free commute in Regina
                    </p>
                </motion.div>

                {/* Features Grid */}
                <div
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    {/* Tab Navigation (30%) */}
                    <div className="lg:col-span-4 space-y-4">
                        {features.map((feature, index) => {
                            const Icon = iconMap[feature.icon] || Map;
                            const isActive = activeFeature === index;

                            return (
                                <motion.button
                                    key={feature.id}
                                    className={`relative overflow-hidden w-full text-left p-6 rounded-2xl transition-all duration-300 border-l-4 ${isActive
                                        ? 'bg-white border-[#003DA5] shadow-lg shadow-blue-100'
                                        : 'bg-white/70 border-transparent hover:bg-white hover:border-gray-200 hover:shadow-md'
                                        }`}
                                    onClick={() => showFeature(index)}
                                    whileHover={{ x: 8 }}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: index * 0.1 }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive
                                            ? 'bg-gradient-to-br from-[#003DA5] to-[#0066FF] text-white'
                                            : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            <Icon size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={`font-bold text-lg mb-1 ${isActive ? 'text-gray-900' : 'text-gray-700'
                                                }`}>
                                                {feature.title}
                                            </h3>
                                            <p className={`text-sm ${isActive ? 'text-gray-600' : 'text-gray-500'
                                                }`}>
                                                {feature.description.split('.')[0]}.
                                            </p>
                                        </div>
                                    </div>
                                    {isActive && (
                                        <div
                                            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#003DA5] to-[#0066FF] transition-[width] duration-100 ease-linear"
                                            style={{ width: `${Math.min(progress, 1) * 100}%` }}
                                        />
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Content Area (70%) */}
                    <div className="order-first lg:order-none lg:col-span-8 flex items-center justify-center min-h-[500px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeFeature}
                                className="relative w-full"
                                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                                transition={{ duration: 0.5 }}
                            >
                                {(() => {
                                    if (features[activeFeature].id === CHARACTERS_FEATURE) {
                                        const turn = CHARACTERS[Math.min(CHARACTERS.length - 1, Math.floor(progress * CHARACTERS.length))].id;
                                        return <CharacterPreview selected={pickedCharacter ?? turn} onPick={setPickedCharacter} />;
                                    }

                                    const Frame = current.mockup === 'phone' ? PhoneMockup : LaptopMockup;

                                    return (
                                        <Frame>
                                            {current.video
                                                ? <Clip video={current.video} alt={features[activeFeature].title} paused={paused} onProgress={setProgress} />
                                                : <current.Demo />}
                                        </Frame>
                                    );
                                })()}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
}
