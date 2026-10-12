/**
 * PlaceBubble — the small speech bubble shown above a searched place, asking whether
 * to find buses there. It is styled as if the user's chosen map character is speaking:
 * each character brings its own look, caption and action word.
 *
 *  PlaceBubbleCard — the bubble itself (pure presentation)
 *  PlaceBubble     — the card anchored above a map position
 *  destinationPinFor — matching flag pin for the place
 */
import React from 'react';
import { OverlayView } from '@react-google-maps/api';
import { Bus, X } from 'lucide-react';
import { MARKER_CHARACTERS, type MarkerCharacterId } from '../../../models/data/markerCharacters';

interface BubbleTheme {
    /** Small line above the place name, in the character's voice. */
    caption: string;
    /** Action word on the button (always shown next to a bus icon). */
    verb: string;
    card: React.CSSProperties;
    captionStyle: React.CSSProperties;
    nameStyle?: React.CSSProperties;
    button: React.CSSProperties;
    /** Colour of the close icon and of the destination flag. */
    accent: string;
    /** Fill of the little tail under the bubble (matches the card's bottom edge). */
    tail: string;
}

const star = (x: number, y: number, o = 1) =>
    `radial-gradient(1.6px 1.6px at ${x}% ${y}%, rgba(255,255,255,${o}) 60%, transparent 61%)`;

const THEMES: Record<MarkerCharacterId, BubbleTheme> = {
    // Plain card in the original blue
    default: {
        caption: 'Find buses to', verb: 'Buses',
        card: {
            background: '#ffffff', color: '#202124', border: '1px solid #dadce0', borderRadius: 14,
            boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
        },
        captionStyle: { color: '#5f6368' },
        button: { background: '#1a73e8', color: '#ffffff' },
        accent: '#5f6368', tail: '#ffffff',
    },
    // Mission-control panel: a starfield, and the trip is a launch
    astronaut: {
        caption: 'Destination locked', verb: 'Launch',
        card: {
            background: [star(5, 22), star(14, 80, 0.7), star(30, 12, 0.8), star(46, 88), star(60, 10, 0.6), star(70, 86, 0.9), star(84, 14), star(95, 70, 0.7),
                'linear-gradient(135deg, #0b1026, #1c2658)'].join(', '),
            color: '#ffffff', border: '1px solid #4a5aa8', borderRadius: 14,
            boxShadow: '0 0 0 3px rgba(74,90,168,0.25), 0 6px 18px rgba(8,12,40,0.45)',
        },
        captionStyle: { color: '#9fb4ff', letterSpacing: '0.08em', textTransform: 'uppercase' },
        button: { background: '#d9483b', color: '#ffffff' },
        accent: '#9fb4ff', tail: '#141b40',
    },
    // Terminal readout: squared panel, monospace, scanlines
    robot: {
        caption: '> target acquired', verb: 'Route',
        card: {
            background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 3px), #2c343f',
            color: '#eef2f6', border: '1px solid #f5b82e', borderRadius: 4,
            boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        },
        captionStyle: { color: '#f5b82e' },
        button: { background: '#f5b82e', color: '#1f2530', borderRadius: 3 },
        accent: '#f5b82e', tail: '#2c343f',
    },
    // Warm and soft: the fox is a tracker following a trail
    fox: {
        caption: 'On the trail to', verb: 'Track',
        card: {
            background: '#fff6ea', color: '#4a2a14', border: '2px solid #c2531a', borderRadius: 20,
            boxShadow: '0 6px 16px rgba(194,83,26,0.25)',
        },
        captionStyle: { color: '#c2531a', fontStyle: 'italic' },
        button: { background: '#c2531a', color: '#ffffff' },
        accent: '#c2531a', tail: '#fff6ea',
    },
    // Ice and snow: frosty panel with a snow line on top
    penguin: {
        caption: 'Waddle over to', verb: 'Slide',
        card: {
            background: 'linear-gradient(180deg, #ffffff 0%, #ffffff 18%, #e1f2ff 100%)',
            color: '#1d2433', border: '1px solid #9fd3ff', borderRadius: 16,
            boxShadow: 'inset 0 3px 0 #ffffff, 0 0 0 3px rgba(159,211,255,0.35), 0 6px 16px rgba(29,36,51,0.2)',
        },
        captionStyle: { color: '#2f86c8' },
        button: { background: '#1d2433', color: '#ffffff' },
        accent: '#2f86c8', tail: '#e1f2ff',
    },
    // Comic-book panel: bold outline, halftone dots, hard drop shadow
    hero: {
        caption: 'Next stop!', verb: 'Go!',
        card: {
            background: 'radial-gradient(rgba(22,48,95,0.13) 1px, transparent 1.6px) 0 0 / 6px 6px, #ffffff',
            color: '#16305f', border: '2.5px solid #16305f', borderRadius: 10,
            boxShadow: '4px 4px 0 #16305f',
        },
        captionStyle: { color: '#e06a00', fontWeight: 800, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.04em' },
        nameStyle: { fontWeight: 800 },
        button: { background: '#ff8a1f', color: '#16305f', fontWeight: 800, textTransform: 'uppercase', border: '2px solid #16305f' },
        accent: '#16305f', tail: '#ffffff',
    },
};

interface CardProps {
    character: MarkerCharacterId;
    name: string;
    onConfirm: () => void;
    onClose: () => void;
}

export function PlaceBubbleCard({ character, name, onConfirm, onClose }: CardProps) {
    const theme = THEMES[character];
    const art = MARKER_CHARACTERS.find(c => c.id === character) ?? MARKER_CHARACTERS[0];

    return (
        <div style={{ position: 'relative', width: 'max-content', maxWidth: 'min(340px, 88vw)' }}>
            <div
                role="dialog"
                aria-label={`Find buses to ${name}?`}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px 5px 8px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    ...theme.card,
                }}
            >
                <img src={art.src} alt="" width={30} height={30} draggable={false} style={{ flex: 'none' }} />
                <div style={{ minWidth: 0, flex: 1, lineHeight: 1.2 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 600, whiteSpace: 'nowrap', ...theme.captionStyle }}>{theme.caption}</div>
                    <div
                        title={name}
                        style={{
                            // Long names wrap onto a second line rather than being cut off
                            fontSize: 13, fontWeight: 600, overflowWrap: 'anywhere', overflow: 'hidden',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', ...theme.nameStyle,
                        }}
                    >
                        {/* Search results arrive as "Place, street, city…" — the place alone keeps the bubble short */}
                        {name.split(',')[0]}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onConfirm}
                    aria-label={`Show bus routes to ${name}`}
                    style={{
                        flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px',
                        border: 'none', borderRadius: 16, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                        cursor: 'pointer', ...theme.button,
                    }}
                >
                    <Bus size={14} aria-hidden /> {theme.verb}
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Dismiss"
                    style={{
                        flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 26, height: 26, border: 'none', borderRadius: 13, background: 'transparent',
                        color: theme.accent, cursor: 'pointer',
                    }}
                >
                    <X size={15} aria-hidden />
                </button>
            </div>
            {/* Tail pointing at the pin */}
            <div style={{
                position: 'absolute', left: '50%', bottom: -6, width: 12, height: 12, marginLeft: -6,
                transform: 'rotate(45deg)', background: theme.tail,
                borderRight: theme.card.border, borderBottom: theme.card.border,
            }} />
        </div>
    );
}

interface BubbleProps extends CardProps {
    position: { lat: number; lng: number };
}

const PIN_HEIGHT = 50;

// Clicks and drags on the bubble must not fall through to the map underneath (a map tap would pick a
// new place). A callback ref, because OverlayView mounts the bubble's DOM only after the overlay is added.
const blockMapHits = (el: HTMLDivElement | null) => {
    if (el) google.maps.OverlayView.preventMapHitsAndGesturesFrom(el);
};

export default function PlaceBubble({ position, ...card }: BubbleProps) {
    return (
        <OverlayView position={position} mapPaneName={OverlayView.FLOAT_PANE}>
            <div ref={blockMapHits} style={{ transform: `translate(-50%, calc(-100% - ${PIN_HEIGHT + 12}px))`, width: 'max-content' }}>
                <PlaceBubbleCard {...card} />
            </div>
        </OverlayView>
    );
}

/** Destination flag in the character's colour (replaces Google's red pin). */
export function destinationPinFor(character: MarkerCharacterId) {
    const c = { default: '#ea4335', astronaut: '#d9483b', penguin: '#1d2433' }[character as string] ?? THEMES[character].accent;
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
  <ellipse cx="9" cy="33.5" rx="6" ry="2" fill="#000" opacity="0.25"/>
  <rect x="7.6" y="3" width="2.8" height="30" rx="1.4" fill="#2a2f3a" stroke="white" stroke-width="1"/>
  <path d="M10 4.5 L25.5 9.5 L10 15.5 z" fill="${c}" stroke="white" stroke-width="1.6" stroke-linejoin="round"/>
</svg>`;
    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        // Drawn at 1.5× the 28×36 artwork so the flag is easy to spot on a busy map
        width: 42, height: 54, anchorX: 13.5, anchorY: 49.5,
    };
}
