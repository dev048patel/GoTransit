/* Characters a user can pick as their "you are here" map marker.
   Artwork: Microsoft Fluent Emoji (3D), MIT — see src/assets/characters/LICENSE */
import robot from '../../assets/characters/robot.png';
import fox from '../../assets/characters/fox.png';
import penguin from '../../assets/characters/penguin.png';
import astronaut from '../../assets/characters/astronaut.png';
import hero from '../../assets/characters/hero.png';

// The original "you are here" blue dot
const dot = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <circle cx="20" cy="20" r="18" fill="#4285F4" opacity="0.15"/>
  <circle cx="20" cy="20" r="12" fill="#4285F4" opacity="0.25"/>
  <circle cx="20" cy="20" r="7" fill="#4285F4" stroke="white" stroke-width="2.5"/>
</svg>`)}`;

export const MARKER_CHARACTERS = [
    { id: 'default', label: 'Default', src: dot },
    { id: 'robot', label: 'Robot', src: robot },
    { id: 'fox', label: 'Fox', src: fox },
    { id: 'penguin', label: 'Penguin', src: penguin },
    { id: 'astronaut', label: 'Astronaut', src: astronaut },
    { id: 'hero', label: 'Hero', src: hero },
] as const;

export type MarkerCharacterId = typeof MARKER_CHARACTERS[number]['id'];

export const DEFAULT_MARKER_CHARACTER: MarkerCharacterId = 'default';

export function isMarkerCharacterId(v: unknown): v is MarkerCharacterId {
    return MARKER_CHARACTERS.some(c => c.id === v);
}
