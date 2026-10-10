/* Words each map character uses on the map screens. Only non-critical text is voiced:
   waiting messages and the "recommended" tag. Times, stop names, warnings and button
   labels stay plain in every theme. */
import type { MarkerCharacterId } from './markerCharacters';

export interface CharacterVoice {
    locating: string;
    searching: string;
    /** Tag on the best route. */
    recommended: string;
}

export const CHARACTER_VOICE: Record<MarkerCharacterId, CharacterVoice> = {
    default: { locating: 'Detecting your location…', searching: 'Finding routes…', recommended: 'Recommended' },
    robot: { locating: '> locating user…', searching: '> computing routes…', recommended: 'Optimal route' },
    fox: { locating: 'Sniffing out where you are…', searching: 'Tracking down the best trail…', recommended: 'Best trail' },
    penguin: { locating: 'Finding you on the ice…', searching: 'Looking for the smoothest slide…', recommended: 'Smoothest ride' },
    astronaut: { locating: 'Locking onto your position…', searching: 'Plotting your course…', recommended: 'Prime route' },
    hero: { locating: 'Pinpointing your position!', searching: 'Scouting the fastest way!', recommended: 'Best pick!' },
};
