/* A city bus drawn side-on, with team members visible through the lit windows.
   It drives the roads on the team pages: wheels turn only while it moves, the headlight beam
   comes on, and it turns to face the way it is travelling. */
import React, { useId, useState } from 'react';
import { motion, useMotionValueEvent, useTransform, useVelocity, type MotionValue } from 'framer-motion';

export interface Rider {
    src: string;
    /** A real photo fills the window; a character sits in it */
    isPhoto: boolean;
}

interface TeamBusProps {
    riders: Rider[];
    color: string;
    colorDark: string;
    /** Text on the destination sign */
    sign: string;
    /** Facing left instead of right */
    flipped?: boolean;
    moving?: boolean;
    /** Square-cornered body with nothing sticking out, used as the side panel of the 3D bus */
    boxy?: boolean;
    /** Face shown at the wheel, in the driver's side window */
    driver?: string;
    className?: string;
}

/* The two passenger windows riders sit behind */
const PANES = [{ x: 18, w: 42 }, { x: 64, w: 42 }];
const WHEELS = [66, 214];

const SHELL = 'M 14,18 H 236 Q 262,18 266,46 L 268,84 Q 268,90 262,90 H 14 Q 8,90 8,84 V 24 Q 8,18 14,18 Z';
const BOXY_SHELL = 'M 12,18 H 264 Q 268,18 268,22 V 86 Q 268,90 264,90 H 12 Q 8,90 8,86 V 22 Q 8,18 12,18 Z';

export default function TeamBus({ riders, color, colorDark, sign, flipped = false, moving = true, boxy = false, driver, className = 'w-[190px] h-[76px]' }: TeamBusProps) {
    const shell = boxy ? BOXY_SHELL : SHELL;
    const id = useId().replace(/:/g, '');
    /* Lettering is mirrored back when the bus faces left, so it always reads correctly */
    const readable = (cx: number) => (flipped ? `translate(${2 * cx} 0) scale(-1 1)` : undefined);

    return (
        <motion.div
            className={className}
            animate={{ y: moving && !boxy ? [0, -1.2, 0] : 0 }}
            transition={moving ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        >
            <svg
                viewBox="0 0 280 112"
                className="w-full h-full overflow-visible transition-transform duration-300"
                style={{ transform: flipped ? 'scaleX(-1)' : undefined }}
            >
                <defs>
                    <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#ffffff" />
                        <stop offset="1" stopColor="#e3e8ee" />
                    </linearGradient>
                    <linearGradient id={`${id}-band`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor={colorDark} />
                        <stop offset="1" stopColor={color} />
                    </linearGradient>
                    <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#2a3a50" />
                        <stop offset="1" stopColor="#0f1a2b" />
                    </linearGradient>
                    <linearGradient id={`${id}-lit`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#fff7e0" />
                        <stop offset="1" stopColor="#dbeafe" />
                    </linearGradient>
                    <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#bfe0ff" />
                        <stop offset="1" stopColor="#4f7fb3" />
                    </linearGradient>
                    <radialGradient id={`${id}-rim`}>
                        <stop offset="0" stopColor="#f3f4f6" />
                        <stop offset="1" stopColor="#8b95a3" />
                    </radialGradient>
                    <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#fde68a" stopOpacity="0.75" />
                        <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
                    </linearGradient>
                    <clipPath id={`${id}-shell`}>
                        <path d={shell} />
                    </clipPath>
                    {PANES.map((p, i) => (
                        <clipPath key={i} id={`${id}-pane${i}`}>
                            <rect x={p.x} y="28" width={p.w} height="30" rx="4" />
                        </clipPath>
                    ))}
                </defs>

                {/* Shadow on the road, and the headlight beam while driving */}
                {!boxy && <ellipse cx="138" cy="105" rx="128" ry="5.5" fill="#0f172a" opacity="0.2" />}
                {moving && !boxy && <path d="M 266,70 L 318,58 L 318,96 L 266,80 Z" fill={`url(#${id}-beam)`} />}

                {/* Roof units */}
                <rect x="64" y="10" width="78" height="9" rx="3" fill="#c5ccd6" />
                <rect x="70" y="12.5" width="66" height="1.5" fill="#9aa4b1" />
                <rect x="168" y="12" width="34" height="7" rx="2.5" fill="#c5ccd6" />

                {/* Body, with the coloured lower band */}
                <path d={shell} fill={`url(#${id}-body)`} stroke="#b8c1cc" strokeWidth="1" />
                <g clipPath={`url(#${id}-shell)`}>
                    <rect x="0" y="62" width="280" height="30" fill={`url(#${id}-band)`} />
                    <rect x="0" y="62" width="280" height="1.6" fill="#ffffff" opacity="0.75" />
                    <rect x="0" y="22.5" width="280" height="2.5" fill={color} />
                    <rect x="0" y="85.5" width="280" height="5" fill="#1f2937" />
                    {/* Engine grille at the back */}
                    {[13, 17, 21, 25].map(x => <rect key={x} x={x} y="68" width="1.6" height="13" fill="#000000" opacity="0.28" />)}
                    {/* Wheel arches */}
                    {WHEELS.map(x => <circle key={x} cx={x} cy="91" r="18" fill="#111827" />)}
                </g>

                {/* Passenger windows: lit, with a rider in each */}
                {PANES.map((p, i) => {
                    const rider = riders[i];
                    return (
                        <g key={i}>
                            <rect x={p.x} y="28" width={p.w} height="30" rx="4" fill={rider ? `url(#${id}-lit)` : `url(#${id}-glass)`} />
                            {rider && (
                                <g clipPath={`url(#${id}-pane${i})`}>
                                    {rider.isPhoto
                                        ? <image href={rider.src} x={p.x} y="28" width={p.w} height="30" preserveAspectRatio="xMidYMin slice" />
                                        : (
                                            <image href={rider.src} x={p.x + 1} y="26" width="40" height="40">
                                                <animateTransform attributeName="transform" type="translate" values="0 0; 0 -1.6; 0 0" dur={`${2.2 + i * 0.5}s`} repeatCount="indefinite" />
                                            </image>
                                        )}
                                    {/* Seat back, and the glass in front of them */}
                                    <rect x={p.x + p.w - 9} y="46" width="9" height="14" rx="2" fill="#334155" opacity="0.55" />
                                    <rect x={p.x} y="28" width={p.w} height="30" fill="#0f1a2b" opacity="0.08" />
                                    <path d={`M ${p.x + 6},28 L ${p.x + 18},28 L ${p.x + 6},58 L ${p.x - 6},58 Z`} fill="#ffffff" opacity="0.28" />
                                </g>
                            )}
                            <rect x={p.x} y="28" width={p.w} height="30" rx="4" fill="none" stroke="#1e293b" strokeWidth="1.6" />
                        </g>
                    );
                })}

                {/* Rear door, a dark window, the front door */}
                {[112, 198].map(x => (
                    <g key={x}>
                        <rect x={x} y="27" width="30" height="57" rx="3" fill={`url(#${id}-glass)`} stroke="#1e293b" strokeWidth="1.6" />
                        <rect x={x + 14.3} y="27" width="1.4" height="57" fill="#0b1220" />
                        <path d={`M ${x + 3},30 L ${x + 9},30 L ${x + 3},52 Z`} fill="#ffffff" opacity="0.2" />
                        <rect x={x + 6} y="50" width="1.4" height="14" rx="0.7" fill="#cbd5e1" />
                        <rect x={x + 22.6} y="50" width="1.4" height="14" rx="0.7" fill="#cbd5e1" />
                    </g>
                ))}
                <rect x="146" y="28" width="48" height="30" rx="4" fill={`url(#${id}-glass)`} stroke="#1e293b" strokeWidth="1.6" />
                <path d="M 152,28 L 166,28 L 152,58 L 146,58 Z" fill="#ffffff" opacity="0.16" />
                <rect x="170" y="45" width="10" height="13" rx="2" fill="#475569" opacity="0.7" />

                {/* Name on the panel between the doors */}
                <g transform={readable(170)}>
                    <text x="170" y="78" textAnchor="middle" fontSize="7.4" fontWeight="800" letterSpacing="1.5" fill="#ffffff" fontFamily="Inter, sans-serif">TRANSIT</text>
                </g>

                {/* Windscreen, driver's seat and wheel, mirror */}
                <path d={boxy ? 'M 232,27 H 262 V 58 H 232 Z' : 'M 232,27 H 250 Q 261,29 263,46 L 264,58 H 232 Z'} fill={`url(#${id}-screen)`} stroke="#1e293b" strokeWidth="1.6" />
                <rect x="235" y="42" width="9" height="16" rx="2" fill="#1e293b" opacity="0.7" />
                {driver && <image href={driver} x="234" y="30" width="26" height="26" />}
                <path d="M 248,50 L 256,46" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                <path d="M 238,27 L 246,27 L 236,50 L 232,50 Z" fill="#ffffff" opacity="0.3" />
                {!boxy && <path d="M 262,31 L 272,35" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" />}
                {!boxy && <rect x="270" y="33" width="5" height="13" rx="2" fill="#1f2937" />}

                {/* Destination sign */}
                <rect x="146" y="17.2" width="84" height="8.4" rx="1.6" fill="#0b0f14" />
                <g transform={readable(188)}>
                    <text x="188" y="23.9" textAnchor="middle" fontSize="6.6" fontWeight="700" letterSpacing="0.9" fill="#fbbf24" fontFamily="ui-monospace, Menlo, monospace">{sign}</text>
                </g>

                {/* Lights and the bike rack on the nose */}
                <rect x="262.5" y="69" width="5" height="8" rx="2" fill="#fef3c7" stroke="#d6a916" strokeWidth="0.6" />
                <rect x="263" y="79" width="4" height="3" rx="1" fill="#f59e0b" />
                <rect x="8" y="66" width="3" height="9" rx="1" fill="#ef4444" />
                {!boxy && <path d="M 268,74 H 277 V 88 M 272,74 V 88" fill="none" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" />}

                {/* Wheels */}
                {WHEELS.map(x => (
                    <g key={x}>
                        <circle cx={x} cy="92" r="14.5" fill="#0b0f14" />
                        <circle cx={x} cy="92" r="11.5" fill="none" stroke="#2b3441" strokeWidth="1.4" />
                        <g className="animate-spin" style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDuration: '0.7s', animationPlayState: moving ? 'running' : 'paused' }}>
                            <circle cx={x} cy="92" r="8.5" fill={`url(#${id}-rim)`} stroke="#6b7280" strokeWidth="0.8" />
                            {[0, 72, 144, 216, 288].map(a => (
                                <circle key={a} cx={x + 5.2 * Math.cos((a * Math.PI) / 180)} cy={92 + 5.2 * Math.sin((a * Math.PI) / 180)} r="1.15" fill="#4b5563" />
                            ))}
                            <circle cx={x} cy="92" r="2.4" fill="#4b5563" />
                        </g>
                    </g>
                ))}
            </svg>
        </motion.div>
    );
}

/* The bus placed on a vertical road and tied to scrolling: `progress` (0 to 1) is how far down it is.
   It only "drives" while the page is actually moving, and faces left when the reader scrolls back up. */
export function RidingBus({ progress, className = '', ...bus }: Omit<TeamBusProps, 'flipped' | 'moving'> & { progress: MotionValue<number>; className?: string }) {
    const velocity = useVelocity(progress);
    const [moving, setMoving] = useState(false);
    const [flipped, setFlipped] = useState(false);
    useMotionValueEvent(velocity, 'change', v => {
        setMoving(Math.abs(v) > 0.01);
        if (v > 0.01) setFlipped(false);
        else if (v < -0.01) setFlipped(true);
    });
    const top = useTransform(progress, v => `${v * 100}%`);

    return (
        <motion.div className={`absolute z-20 -ml-[95px] -mt-[38px] ${className}`} style={{ top }}>
            <TeamBus {...bus} flipped={flipped} moving={moving} />
        </motion.div>
    );
}

/* A vertical road: pale where the bus has yet to go, asphalt with lane markings where it has been */
export function Road({ progress, className = '' }: { progress: MotionValue<number>; className?: string }) {
    const travelled = useTransform(progress, v => `inset(0 0 ${100 - v * 100}% 0 round 999px)`);
    return (
        <>
            <div className={`absolute w-3 -ml-1.5 rounded-full bg-slate-300/70 ${className}`} />
            <motion.div className={`absolute w-3 -ml-1.5 rounded-full bg-slate-700 ${className}`} style={{ clipPath: travelled }}>
                <div className="absolute inset-y-2 left-1/2 w-[2px] -ml-px" style={{ background: 'repeating-linear-gradient(180deg, #f8fafc 0 9px, transparent 9px 20px)' }} />
            </motion.div>
        </>
    );
}
