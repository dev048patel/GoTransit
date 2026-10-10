/* TrackingPanel — live trip tracking: summary, what to do right now, and the step-by-step timeline.
   Docked on the right on desktop (the map stays visible); a collapsible bottom sheet on phones. */
import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, X } from 'lucide-react';
import transitColors from '../../../models/data/transitColors';
import { TrackingPanelProps } from '../../../models/components/TrackingPanelProps';
import { formatTime, calculateArrivalTime, calculateBoardTime } from '../../../models/services/TimeService';

// Step dot colours carry meaning and are the same in every theme
const BLUE = '#4285F4', GREY = '#5f6368', RED = '#ea4335', ORANGE = '#e37400', GREEN = '#34a853';

// Pure view component — time calculations delegated to TimeService
export default function TrackingPanel({ tripOption, onStopTracking, onBack }: TrackingPanelProps) {
    const [collapsed, setCollapsed] = useState(false);

    const now = new Date();
    const effectiveTime = tripOption.totalTimeWithWait ?? tripOption.totalTime;
    const arrivalTime = calculateArrivalTime(effectiveTime);
    const first = tripOption.segments[0];
    const walkToStop = tripOption.walkToFirstStop ?? tripOption.walkingDistance;

    // Look up official bus route color from transit color data
    const getRouteColor = (routeNum: string): string => {
        const colorData = transitColors.find(c => c.route_id === parseInt(routeNum));
        return colorData ? colorData.colour : '#1a73e8';
    };

    // One sentence telling the rider what to do this minute
    const live = tripOption.isLivePrediction && tripOption.waitTime !== undefined;
    const busIn = !live ? '' : tripOption.waitTime! <= 1 ? 'bus arriving now' : `bus in ~${tripOption.waitTime} min`;

    return (
        <div className="tracking-panel t-panel" style={panelStyle}>
            {/* Handle: tap to shrink to the summary or open the steps */}
            <button
                type="button"
                onClick={() => setCollapsed(c => !c)}
                aria-expanded={!collapsed}
                aria-label={collapsed ? 'Show trip steps' : 'Hide trip steps'}
                style={handleBtnStyle}
            >
                <ChevronDown size={16} style={{ transform: collapsed ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }} aria-hidden />
            </button>

            {/* Summary: total time, arrival, routes, and the two actions */}
            <div className="t-panel-header" style={headerStyle}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '20px', color: '#202124', whiteSpace: 'nowrap' }}>{effectiveTime} min</span>
                        <span style={{ fontSize: '13px', color: '#5f6368', whiteSpace: 'nowrap' }}>
                            Arrive {formatTime(arrivalTime)}
                            {tripOption.isLivePrediction && <span style={{ fontWeight: 600 }}> · Live</span>}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px', flexWrap: 'wrap' }}>
                        {tripOption.segments.map((seg, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && <span style={{ fontSize: '12px' }} aria-hidden>›</span>}
                                <span className="t-keep" style={{ ...routeBadgeStyle, backgroundColor: getRouteColor(seg.routeNum) }}>Route {seg.routeNum}</span>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {onBack && (
                        <button type="button" onClick={onBack} style={backBtnStyle}>
                            <ArrowLeft size={14} aria-hidden /> Routes
                        </button>
                    )}
                    <button type="button" className="t-keep" onClick={onStopTracking} style={stopBtnStyle}>
                        <X size={14} aria-hidden /> Stop
                    </button>
                </div>
            </div>

            {/* Right now */}
            <div style={nowStyle} role="status">
                {live && <span style={liveDotStyle} aria-hidden />}
                <span>
                    <strong>Walk {walkToStop} m</strong> to {first.fromStop}
                    {busIn && <span style={{ fontWeight: 600 }}> · {busIn}</span>}
                    {live && first.busDistanceAway ? (
                        <span style={{ color: '#5f6368' }}> ({(first.busDistanceAway / 1000).toFixed(1)} km away)</span>
                    ) : null}
                </span>
            </div>

            {/* Step-by-step timeline */}
            {!collapsed && (
                <div style={timelineStyle}>
                    <Step time={formatTime(now)} color={BLUE} line={GREY} dashed title="Your location" />
                    <Step small color={GREY} line={GREY} dashed title={`Walk ${walkToStop} m`} />

                    {tripOption.segments.map((seg, i) => {
                        const segColor = getRouteColor(seg.routeNum);
                        const walkMinutes = Math.round((tripOption.walkingDistance / 1000) / 5 * 60);
                        // Cumulative time of previous segments, for the fallback estimate
                        const prevSegmentsTotalTime = tripOption.segments.slice(0, i).reduce((acc, s) => acc + s.estimatedTime, 0);
                        // Live prediction when available, otherwise an estimate
                        const boardTime = calculateBoardTime(i, seg.predTime, walkMinutes, tripOption.waitTime, prevSegmentsTotalTime, now);
                        const isLast = i === tripOption.segments.length - 1;
                        const nextSeg = tripOption.segments[i + 1];
                        const isWalkTransfer = !isLast && seg.toStop !== nextSeg?.fromStop;

                        return (
                            <React.Fragment key={i}>
                                <Step
                                    time={formatTime(boardTime)} color={segColor} line={segColor} thick
                                    title={seg.fromStop}
                                    detail={
                                        <>
                                            <span style={{ ...routeBadgeStyle, backgroundColor: segColor, marginRight: '6px' }}>{seg.routeNum}</span>
                                            <span>{seg.routeName}</span>{' '}
                                            {i === 0 && seg.nextBusETA !== undefined && (
                                                <span style={waitChipStyle}>{seg.nextBusETA <= 1 ? 'Now' : `~${seg.nextBusETA} min wait`}</span>
                                            )}
                                        </>
                                    }
                                />
                                <Step small color={segColor} line={segColor} thick title={`Ride ~${seg.estimatedTime} min`} />
                                <Step
                                    color={RED} line={isLast ? GREY : ORANGE} dashed
                                    title={seg.toStop}
                                    tag={<span style={{ color: '#c5221f', fontWeight: 600, whiteSpace: 'nowrap' }}>Get off</span>}
                                />
                                {!isLast && isWalkTransfer && tripOption.transferWalkDistance ? (
                                    <Step small color={GREY} line={GREY} dashed title={`Walk ${tripOption.transferWalkDistance} m to ${nextSeg?.fromStop}`} />
                                ) : null}
                                {!isLast && (
                                    <Step small color={ORANGE} line={ORANGE} dashed
                                        title={<span style={{ color: '#b06000', fontWeight: 600 }}>Transfer · wait ~5 min</span>} />
                                )}
                            </React.Fragment>
                        );
                    })}

                    <Step time={formatTime(arrivalTime)} color={GREEN} title="Arrive at destination" last />
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.2); }
                }
                /* Desktop: dock on the right so the map stays visible */
                @media (min-width: 641px) {
                    .tracking-panel {
                        top: 10px !important;
                        bottom: auto !important;
                        right: 10px !important;
                        left: auto !important;
                        width: 360px !important;
                        max-height: calc(100vh - 20px) !important;
                        border-radius: 16px !important;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.18) !important;
                    }
                }
            `}</style>
        </div>
    );
}

/* One timeline row: [time] [dot + line] [what happens]. `small` rows are the in-between
   moments (walk, ride, transfer); normal rows are places. */
function Step({ time, color, line, dashed, thick, small, last, title, tag, detail }: {
    time?: string; color: string; line?: string; dashed?: boolean; thick?: boolean; small?: boolean; last?: boolean;
    title: React.ReactNode; tag?: React.ReactNode; detail?: React.ReactNode;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'stretch', minHeight: small ? '24px' : '34px' }}>
            <div style={timeColStyle}>{time}</div>
            <div style={{ width: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={small
                    ? { width: '7px', height: '7px', borderRadius: '50%', backgroundColor: color, marginTop: '6px', flexShrink: 0 }
                    : { width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color, border: '2px solid white', boxShadow: `0 0 0 1px ${color}`, marginTop: '4px', flexShrink: 0 }
                } />
                {!last && line && (
                    <div style={{
                        flex: 1, width: thick ? '4px' : '2px', marginTop: '2px', borderRadius: '1px',
                        backgroundColor: dashed ? 'transparent' : line,
                        backgroundImage: dashed ? `linear-gradient(${line} 50%, transparent 50%)` : 'none',
                        backgroundSize: dashed ? '2px 8px' : 'auto', backgroundRepeat: 'repeat-y',
                    }} />
                )}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingLeft: '8px', paddingBottom: small ? '4px' : '8px' }}>
                <div style={{
                    fontSize: small ? '12.5px' : '14px', fontWeight: small ? 400 : 600,
                    color: small ? '#5f6368' : '#202124', lineHeight: 1.3, overflowWrap: 'anywhere',
                }}>
                    {title}{tag && <span style={{ fontSize: '12.5px', fontWeight: 400, whiteSpace: 'nowrap' }}> · {tag}</span>}
                </div>
                {detail && (
                    <div style={{ fontSize: '12.5px', color: '#5f6368', marginTop: '3px', lineHeight: 1.5 }}>
                        {detail}
                    </div>
                )}
            </div>
        </div>
    );
}

// -------- Styles --------

const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    maxHeight: '46vh',
    backgroundColor: 'var(--t-surface)',
    borderRadius: '20px 20px 0 0',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
    zIndex: 1500,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
};

const handleBtnStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    width: '100%', height: '24px', flexShrink: 0,
    border: 'none', background: 'transparent', color: '#80868b', cursor: 'pointer', padding: 0,
};

const headerStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px',
    padding: '0 14px 10px',
    borderBottom: '1px solid var(--t-border-soft)',
};

const nowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: '8px',
    margin: '8px 12px 10px', padding: '8px 10px', borderRadius: '10px',
    backgroundColor: 'var(--t-accent-soft)', color: 'var(--t-accent-dark)',
    fontSize: '13.5px', lineHeight: 1.35,
};

const liveDotStyle: React.CSSProperties = {
    width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#34a853',
    boxShadow: '0 0 6px #34a85380', animation: 'pulse 2s infinite', flexShrink: 0, marginTop: '4px',
};

const timelineStyle: React.CSSProperties = {
    padding: '0 14px 12px',
    overflowY: 'auto',
    flex: 1,
    WebkitOverflowScrolling: 'touch' as any,
};

const timeColStyle: React.CSSProperties = {
    width: '58px', flexShrink: 0, paddingRight: '6px', paddingTop: '2px', textAlign: 'right',
    fontSize: '12.5px', fontWeight: 600, color: '#202124', whiteSpace: 'nowrap',
};

const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '4px', height: '32px', padding: '0 10px',
    borderRadius: '16px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
};

const backBtnStyle: React.CSSProperties = {
    // Outline in the header's own text colour, so it reads on light and dark themed headers alike
    ...btnBase, backgroundColor: 'transparent', color: 'inherit', border: '1.5px solid currentColor',
};

const stopBtnStyle: React.CSSProperties = {
    ...btnBase, backgroundColor: '#d93025', color: 'white', border: '1.5px solid #d93025',
};

const routeBadgeStyle: React.CSSProperties = {
    color: 'white', padding: '1px 8px', borderRadius: '10px',
    fontSize: '11.5px', fontWeight: 700, whiteSpace: 'nowrap',
};

const waitChipStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 600, color: 'var(--t-accent-dark)',
    backgroundColor: 'var(--t-accent-soft)', padding: '1px 6px', borderRadius: '6px',
};
