/* A team member drawn as a transit pass — the card used on the team pages (/connect) */
import React from 'react';
import { MARKER_CHARACTERS } from '../../models/data/markerCharacters';
import { CHARACTER_THEMES } from '../../models/data/characterThemes';
import type { TeamMember } from '../../models/data/team';

export default function TransitPass({ person, number, className = '' }: { person: TeamMember; number: number; className?: string }) {
    const mascot = MARKER_CHARACTERS.find(c => c.id === person.character)!.src;
    const theme = CHARACTER_THEMES[person.character];

    return (
        <div className={`w-[280px] shrink-0 rounded-[28px] bg-white border border-slate-200 overflow-hidden shadow-[0_30px_70px_rgba(15,23,42,0.22)] ${className}`}>
            {/* Header strip in the person's colour, with the lanyard slot */}
            <div className="px-5 pt-3.5 pb-4 text-white" style={{ background: `linear-gradient(135deg, ${theme.primaryDark}, ${theme.primary})` }}>
                <div className="mx-auto mb-3 h-2.5 w-14 rounded-full bg-black/30" />
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em]">
                    <span>Transit Regina</span>
                    <span className="opacity-70">Team pass</span>
                </div>
            </div>

            <div className="px-5 pt-5 pb-4">
                {/* Photo, or the character until a photo is added */}
                <div className="relative mb-4 rounded-2xl overflow-hidden" style={{ background: theme.surface, aspectRatio: '1 / 1' }}>
                    {person.photo
                        ? (
                            <>
                                <img src={person.photo} alt={person.name} className="w-full h-full object-cover" />
                                <img src={mascot} alt="" className="absolute bottom-1.5 right-1.5 w-14 h-14 drop-shadow-lg" />
                            </>
                        )
                        : <img src={mascot} alt="" className="absolute inset-0 m-auto w-3/5 drop-shadow-xl" />}
                </div>
                <div className="text-2xl font-black leading-tight text-slate-900">{person.name}</div>
                <div className="font-bold" style={{ color: theme.primary }}>{person.title}</div>
                <div className="text-sm text-slate-500">{person.focus}</div>
            </div>

            {/* Tear-off strip */}
            <div className="flex items-end justify-between px-5 py-3 border-t-2 border-dashed border-slate-200">
                <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Pass no.</div>
                    <div className="font-mono text-sm font-bold text-slate-800">TR-{String(number).padStart(3, '0')}</div>
                </div>
                <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Zones</div>
                    <div className="font-mono text-sm font-bold text-slate-800">ALL ROUTES</div>
                </div>
                <div
                    className="h-8 w-14"
                    style={{ background: 'repeating-linear-gradient(90deg, #0f172a 0 2px, transparent 2px 4px, #0f172a 4px 5px, transparent 5px 8px, #0f172a 8px 11px, transparent 11px 13px)' }}
                />
            </div>
        </div>
    );
}
