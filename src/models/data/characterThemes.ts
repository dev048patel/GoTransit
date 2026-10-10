/* Colour themes for the map screens — one per map character.
   The map UI has two accent families: "primary" (selection, links, main buttons) and
   "accent" (planning tools, confirmations). Each theme supplies both, as a base colour,
   a soft tint for backgrounds, and a dark shade for text on that tint.
   `default` is the original look. Status colours (on time / late) and route colours are
   never themed — they carry meaning. */
import type { MarkerCharacterId } from './markerCharacters';

export interface CharacterTheme {
    primary: string;
    primarySoft: string;
    primaryDark: string;
    accent: string;
    accentSoft: string;
    accentDark: string;
    accentBorder: string;
    /** Panel background (white in the default look). */
    surface: string;
    /** Card background, a step lighter or greyer than the panel. */
    surface2: string;
    /** Neutral pills: search box, chips, icon buttons. */
    chip: string;
    border: string;
    borderSoft: string;
}

export const CHARACTER_THEMES: Record<MarkerCharacterId, CharacterTheme> = {
    default: {
        primary: '#1a73e8', primarySoft: '#e8f0fe', primaryDark: '#0d47a1',
        accent: '#2e7d32', accentSoft: '#e8f5e9', accentDark: '#1b5e20', accentBorder: '#c8e6c9',
        surface: '#ffffff', surface2: '#f8f9fa', chip: '#f1f3f4', border: '#dadce0', borderSoft: '#e8eaed',
    },
    // Steel grey with warning-light yellow
    robot: {
        primary: '#4a5563', primarySoft: '#eceff3', primaryDark: '#2c343f',
        accent: '#9a6b00', accentSoft: '#fff5d6', accentDark: '#6b4a00', accentBorder: '#f5d98a',
        surface: '#dfe4ea', surface2: '#eef1f4', chip: '#dde3e9', border: '#b9c3ce', borderSoft: '#ccd4dc',
    },
    // Fox orange with warm brown
    fox: {
        primary: '#c2531a', primarySoft: '#ffeede', primaryDark: '#8e3a0e',
        accent: '#8a5424', accentSoft: '#fff6ea', accentDark: '#5e3a17', accentBorder: '#f0cfa8',
        surface: '#ffeeda', surface2: '#fff7ec', chip: '#ffe8d0', border: '#e9c49a', borderSoft: '#f3d9b8',
    },
    // Penguin black with ice blue
    penguin: {
        primary: '#1d2433', primarySoft: '#e6eef7', primaryDark: '#0f1420',
        accent: '#1f78bd', accentSoft: '#e6f4ff', accentDark: '#15588c', accentBorder: '#b9defa',
        surface: '#e3f1fd', surface2: '#f2f9ff', chip: '#dcecfb', border: '#a9d3f3', borderSoft: '#c6e2f8',
    },
    // Deep-space indigo with visor teal (red would read as a warning on good news like "next bus in 6 min")
    astronaut: {
        primary: '#33408f', primarySoft: '#e8ebfb', primaryDark: '#1c2658',
        accent: '#0e7c8f', accentSoft: '#e2f6f9', accentDark: '#095a68', accentBorder: '#a9dfe8',
        surface: '#e3e7fa', surface2: '#f1f3fd', chip: '#dde2f8', border: '#b3bcec', borderSoft: '#cbd2f3',
    },
    // Navy with comic orange
    hero: {
        primary: '#16305f', primarySoft: '#e6ecf7', primaryDark: '#0c1d3d',
        accent: '#c95f00', accentSoft: '#fff1e0', accentDark: '#8f4300', accentBorder: '#ffcf99',
        surface: '#ffefd6', surface2: '#fff8ea', chip: '#ffe9c8', border: '#e8c58f', borderSoft: '#f1d9b0',
    },
};

const VARS: Record<keyof CharacterTheme, string> = {
    primary: '--t-primary', primarySoft: '--t-primary-soft', primaryDark: '--t-primary-dark',
    accent: '--t-accent', accentSoft: '--t-accent-soft', accentDark: '--t-accent-dark', accentBorder: '--t-accent-border',
    surface: '--t-surface', surface2: '--t-surface-2', chip: '--t-chip', border: '--t-border', borderSoft: '--t-border-soft',
};

/** Put a theme's colours on the page as CSS variables (read by the map screens' styles). */
export function applyCharacterTheme(character: MarkerCharacterId): void {
    const root = document.documentElement;
    const theme = CHARACTER_THEMES[character];
    (Object.keys(VARS) as (keyof CharacterTheme)[]).forEach(k => root.style.setProperty(VARS[k], theme[k]));
    root.dataset.characterTheme = character;
}
