/* Characters a user can pick as their "you are here" map marker.
   Artwork: Microsoft Fluent Emoji (3D), MIT — see src/assets/characters/LICENSE */
import robot from '../../assets/characters/robot.png';
import fox from '../../assets/characters/fox.png';
import penguin from '../../assets/characters/penguin.png';
import astronaut from '../../assets/characters/astronaut.png';
import hero from '../../assets/characters/hero.png';

export const MARKER_CHARACTERS = [
    { id: 'robot', label: 'Robot', src: robot },
    { id: 'fox', label: 'Fox', src: fox },
    { id: 'penguin', label: 'Penguin', src: penguin },
    { id: 'astronaut', label: 'Astronaut', src: astronaut },
    { id: 'hero', label: 'Hero', src: hero },
] as const;

export type MarkerCharacterId = typeof MARKER_CHARACTERS[number]['id'];

export const DEFAULT_MARKER_CHARACTER: MarkerCharacterId = 'robot';

export function isMarkerCharacterId(v: unknown): v is MarkerCharacterId {
    return MARKER_CHARACTERS.some(c => c.id === v);
}
