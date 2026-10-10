/* Bus stop marker icons. Every character theme uses the same white bus badge (so a stop
   always reads as a bus stop) in its own colours, with a small topper. All artwork is original. */
import type { MarkerCharacterId } from './markerCharacters';

export interface StopIcon {
    url: string;
    width: number;
    height: number;
    /** Pixel inside the icon that sits on the stop's location. */
    anchorX: number;
    anchorY: number;
}

interface Theme {
    /** Badge colour. */
    fill: string;
    /** Thin inner ring colour. */
    ring: string;
    /** SVG drawn behind the badge, poking out above it (viewBox 28×33, badge centre 14,19). */
    behind?: string;
    /** SVG drawn on top of the badge. */
    front?: string;
}

function badge({ fill, ring, behind = '', front = '' }: Theme): StopIcon {
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="33" viewBox="0 0 28 33">
  ${behind}
  <circle cx="14" cy="19" r="13" fill="${fill}" stroke="white" stroke-width="2"/>
  <circle cx="14" cy="19" r="10.6" fill="none" stroke="${ring}" stroke-width="1.4"/>
  <rect x="9" y="12" width="10" height="14" rx="2" fill="white"/>
  <rect x="10.5" y="14" width="7" height="3.5" rx="1" fill="${fill}"/>
  <circle cx="11.5" cy="22.5" r="1.2" fill="${fill}"/>
  <circle cx="16.5" cy="22.5" r="1.2" fill="${fill}"/>
  <rect x="10.5" y="19" width="7" height="0.8" rx="0.4" fill="${fill}" opacity="0.4"/>
  ${front}
</svg>`;
    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        width: 24, height: 28, anchorX: 12, anchorY: 16,
    };
}

const STOP_ICONS: Record<MarkerCharacterId, StopIcon> = {
    // Antenna with a yellow bulb and two side prongs
    robot: badge({
        fill: '#4a5563', ring: '#f5b82e',
        behind: `<rect x="13.1" y="2.5" width="1.8" height="5" fill="#4a5563"/>
  <rect x="7.6" y="5" width="1.6" height="4" rx="0.8" fill="#4a5563" transform="rotate(-28 8.4 7)"/>
  <rect x="18.8" y="5" width="1.6" height="4" rx="0.8" fill="#4a5563" transform="rotate(28 19.6 7)"/>
  <circle cx="14" cy="3.2" r="2.6" fill="#f5b82e" stroke="white" stroke-width="1.2"/>`,
    }),
    // Two fox ears
    fox: badge({
        fill: '#c2531a', ring: '#ffd9b0',
        behind: `<path d="M3.6 12 L4.2 1.6 L12 7.6 z" fill="#c2531a" stroke="white" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M24.4 12 L23.8 1.6 L16 7.6 z" fill="#c2531a" stroke="white" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M5.4 8.4 L5.6 4.4 L8.6 6.8 z" fill="#2b1a12"/><path d="M22.6 8.4 L22.4 4.4 L19.4 6.8 z" fill="#2b1a12"/>`,
    }),
    // Snow cap
    penguin: badge({
        fill: '#1d2433', ring: '#9fd3ff',
        front: `<path d="M3.2 13.2 Q5.5 5.2 14 5 Q22.5 5.2 24.8 13.2 Q22.6 10.6 20.6 12.6 Q18.6 9.8 16.4 12 Q14 9.4 11.6 12 Q9.4 9.8 7.4 12.6 Q5.4 10.6 3.2 13.2 z" fill="white" stroke="#9fd3ff" stroke-width="0.6"/>`,
    }),
    // Four-point star
    astronaut: badge({
        fill: '#55607a', ring: '#d9483b',
        behind: `<path d="M14 0 L15.3 3.2 L18.6 4.4 L15.3 5.6 L14 8.8 L12.7 5.6 L9.4 4.4 L12.7 3.2 z" fill="#ffd34d" stroke="white" stroke-width="0.9" stroke-linejoin="round"/>`,
    }),
    // Tower beacon
    hero: badge({
        fill: '#16305f', ring: '#ff8a1f',
        behind: `<rect x="13.1" y="2.5" width="1.8" height="5" fill="#16305f"/>
  <circle cx="14" cy="3.2" r="2.6" fill="#ff8a1f" stroke="white" stroke-width="1.2"/>`,
    }),
};

export function stopIconFor(character: MarkerCharacterId): StopIcon {
    return STOP_ICONS[character];
}
