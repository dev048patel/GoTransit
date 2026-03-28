/* TrackingPanel — bottom panel showing live trip tracking with timeline, ETA, and stop controls */
import React from 'react';
import transitColors from '../../../models/data/transitColors';
import { TrackingPanelProps } from '../../../models/components/TrackingPanelProps';
import { formatTime, calculateArrivalTime, calculateBoardTime } from '../../../models/services/TimeService';

// Pure view component — time calculations delegated to TimeService
export default function TrackingPanel({ tripOption, onStopTracking, onBack }: TrackingPanelProps) {
    const now = new Date();
    const effectiveTime = tripOption.totalTimeWithWait ?? tripOption.totalTime;
    const arrivalTime = calculateArrivalTime(effectiveTime);

    // Look up official bus route color from transit color data
    const getRouteColor = (routeNum: string): string => {
        const colorData = transitColors.find(c => c.route_id === parseInt(routeNum));
        return colorData ? colorData.colour : '#1a73e8';
    };

    const primaryColor = getRouteColor(tripOption.segments[0]?.routeNum);

    return (
        <div style={panelStyle}>
            {/* Drag handle */}
            <div style={handleBarStyle}><div style={handleStyle} /></div>

            {/* Header with gradient accent */}
            <div style={{
                ...headerStyle,
                background: `linear-gradient(135deg, ${primaryColor}10 0%, ${primaryColor}05 100%)`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <div style={{
                        width: '42px', height: '42px', borderRadius: '12px',
                        background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '18px', flexShrink: 0,
                        boxShadow: `0 2px 8px ${primaryColor}40`
                    }}>🚌</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '700', fontSize: '18px', color: '#202124' }}>
                            {effectiveTime} min
                        </div>
                        <div style={{ fontSize: '12px', color: '#5f6368' }}>
                            Arrive {formatTime(arrivalTime)}
                            {tripOption.isLivePrediction && (
                                <span style={{
                                    marginLeft: '6px', color: '#2e7d32',
                                    fontWeight: '600', fontSize: '11px'
                                }}>
                                    • Live
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Route summary chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', flexShrink: 0 }}>
                    <span style={miniIconStyle}>🚶</span>
                    {tripOption.segments.map((seg, i) => (
                        <React.Fragment key={i}>
                            <span style={{ color: '#5f6368', fontSize: '12px' }}>›</span>
                            <span style={{
                                ...routeBadgeSmallStyle,
                                backgroundColor: getRouteColor(seg.routeNum)
                            }}>
                                {seg.routeNum}
                            </span>
                        </React.Fragment>
                    ))}
                    <span style={{ color: '#5f6368', fontSize: '12px' }}>›</span>
                    <span style={miniIconStyle}>🚶</span>
                </div>
            </div>

            {/* Live bus ETA banner */}
            {tripOption.isLivePrediction && tripOption.waitTime !== undefined && (
                <div style={{
                    margin: '0 14px',
                    padding: '8px 12px',
                    background: 'linear-gradient(135deg, #e8f5e9, #f1f8e9)',
                    borderRadius: '10px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    marginTop: '8px'
                }}>
                    <span style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        backgroundColor: '#4caf50', display: 'inline-block',
                        boxShadow: '0 0 6px #4caf5080',
                        animation: 'pulse 2s infinite'
                    }} />
                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#2e7d32' }}>
                        {tripOption.waitTime <= 1
                            ? '🎉 Bus arriving now!'
                            : `Next bus in ~${tripOption.waitTime} min`
                        }
                        {tripOption.segments[0]?.busDistanceAway && (
                            <span style={{ color: '#5f6368', fontWeight: '400', fontSize: '12px' }}>
                                {' '}· {(tripOption.segments[0].busDistanceAway / 1000).toFixed(1)} km away
                            </span>
                        )}
                    </span>
                </div>
            )}

            {/* Step-by-step timeline */}
            <div style={timelineContainerStyle}>
                {/* Your location */}
                <TimelineStep
                    color="#4285F4"
                    icon="📍"
                    title="Your location"
                    subtitle=""
                    time={formatTime(now)}
                    lineColor="#5f6368"
                    dashed
                />

                {/* Walk to first stop */}
                <TimelineStep
                    color="#5f6368"
                    icon="🚶"
                    title={`Walk ${tripOption.walkToFirstStop ?? tripOption.walkingDistance}m`}
                    subtitle={`to ${tripOption.segments[0].fromStop}`}
                    time=""
                    lineColor="#5f6368"
                    dashed
                />

                {/* Bus segments — board, ride, alight, transfer */}
                {tripOption.segments.map((seg, i) => {
                    const segColor = getRouteColor(seg.routeNum);
                    const walkMinutes = Math.round((tripOption.walkingDistance / 1000) / 5 * 60);
                    // Calculate cumulative time of previous segments for fallback estimation
                    const prevSegmentsTotalTime = tripOption.segments.slice(0, i).reduce((acc, s) => acc + s.estimatedTime, 0);

                    // Use TimeService to calculate board time (live prediction or fallback estimate)
                    const boardTime = calculateBoardTime(
                        i,
                        seg.predTime,
                        walkMinutes,
                        tripOption.waitTime,
                        prevSegmentsTotalTime,
                        now
                    );

                    return (
                        <React.Fragment key={i}>
                            {/* Board bus */}
                            <TimelineStep
                                color={segColor}
                                icon="🚏"
                                title={seg.fromStop}
                                subtitle={
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ ...routeBadgeTinyStyle, backgroundColor: segColor }}>{seg.routeNum}</span>
                                        <span>{seg.routeName}</span>
                                        {i === 0 && seg.nextBusETA !== undefined && (
                                            <span style={{
                                                fontSize: '10px', fontWeight: '600', color: '#2e7d32',
                                                backgroundColor: '#e8f5e9', padding: '1px 6px', borderRadius: '6px'
                                            }}>
                                                {seg.nextBusETA <= 1 ? 'Now!' : `~${seg.nextBusETA}m wait`}
                                            </span>
                                        )}
                                    </span>
                                }
                                time={formatTime(boardTime)}
                                lineColor={segColor}
                                dashed={false}
                                lineThick
                            />

                            {/* Ride info */}
                            <TimelineStep
                                color={segColor}
                                icon=""
                                title={`Ride ~${seg.estimatedTime} min`}
                                subtitle={`${seg.fromStop} → ${seg.toStop}`}
                                time=""
                                lineColor={segColor}
                                dashed={false}
                                small
                                lineThick
                            />

                            {/* Alight */}
                            <TimelineStep
                                color="#ea4335"
                                icon="🚏"
                                title={seg.toStop}
                                subtitle="Get off here"
                                time=""
                                lineColor={i < tripOption.segments.length - 1 ? '#e37400' : '#5f6368'}
                                dashed={i === tripOption.segments.length - 1}
                            />

                            {/* Transfer */}
                            {i < tripOption.segments.length - 1 && (() => {
                                const nextSeg = tripOption.segments[i + 1];
                                const isWalkTransfer = seg.toStop !== nextSeg?.fromStop;
                                return (
                                    <>
                                        {isWalkTransfer && tripOption.transferWalkDistance && (
                                            <TimelineStep
                                                color="#5f6368"
                                                icon="🚶"
                                                title={`Walk ${tripOption.transferWalkDistance}m`}
                                                subtitle={`to ${nextSeg?.fromStop}`}
                                                time=""
                                                lineColor="#5f6368"
                                                dashed
                                            />
                                        )}
                                        <TimelineStep
                                            color="#e37400"
                                            icon="🔄"
                                            title="Transfer"
                                            subtitle={isWalkTransfer
                                                ? `Board at ${nextSeg?.fromStop} (~5 min wait)`
                                                : 'Wait for next bus (~5 min)'}
                                            time=""
                                            lineColor="#e37400"
                                            dashed
                                        />
                                    </>
                                );
                            })()}
                        </React.Fragment>
                    );
                })}

                {/* Walk to destination */}
                <TimelineStep
                    color="#34a853"
                    icon="🏁"
                    title="Destination"
                    subtitle={tripOption.destinationStop}
                    time={formatTime(arrivalTime)}
                    lineColor="transparent"
                    dashed={false}
                    last
                />
            </div>

            {/* Button area */}
            <div style={buttonsStyle}>
                {onBack && (
                    <button onClick={onBack} style={backBtnStyle}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8f0fe'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                        ← Back to Routes
                    </button>
                )}
                <button onClick={onStopTracking} style={stopBtnStyle}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c62828'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ea4335'}
                >
                    ✕ Stop Tracking
                </button>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.2); }
                }
            `}</style>
        </div>
    );
}

// TimelineStep — reusable timeline row with dot, line, content, and time
function TimelineStep({ color, icon, title, subtitle, time, lineColor, dashed, small, lineThick, last }: {
    color: string; icon: string; title: string; subtitle: React.ReactNode; time: string;
    lineColor: string; dashed: boolean; small?: boolean; lineThick?: boolean; last?: boolean;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'stretch', minHeight: small ? '28px' : '48px' }}>
            {/* Left timeline column */}
            <div style={{ width: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                {small ? (
                    <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        backgroundColor: color, marginTop: '8px', flexShrink: 0
                    }} />
                ) : (
                    <div style={{
                        width: '14px', height: '14px', borderRadius: '50%',
                        backgroundColor: color, border: '2px solid white',
                        boxShadow: `0 0 0 1px ${color}`, flexShrink: 0, marginTop: '4px'
                    }} />
                )}
                {!last && (
                    <div style={{
                        flex: 1, width: lineThick ? '4px' : '2px',
                        backgroundColor: dashed ? 'transparent' : lineColor,
                        backgroundImage: dashed ? `linear-gradient(${lineColor} 50%, transparent 50%)` : 'none',
                        backgroundSize: dashed ? '2px 8px' : 'auto',
                        backgroundRepeat: 'repeat-y',
                        marginTop: '2px', borderRadius: '1px'
                    }} />
                )}
            </div>

            {/* Content */}
            <div style={{
                flex: 1, paddingLeft: '10px', paddingBottom: small ? '4px' : '12px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
            }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: small ? '12px' : '14px',
                        fontWeight: small ? '400' : '500',
                        color: small ? '#5f6368' : '#202124'
                    }}>
                        {icon && <span style={{ fontSize: small ? '12px' : '14px', flexShrink: 0 }}>{icon}</span>}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
                    </div>
                    {subtitle && (
                        <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '2px' }}>
                            {subtitle}
                        </div>
                    )}
                </div>
                {time && (
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#202124', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                        {time}
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
    maxHeight: '55vh',
    backgroundColor: 'white',
    borderRadius: '20px 20px 0 0',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
    zIndex: 1500,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
};

const handleBarStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    padding: '10px 0 4px'
};

const handleStyle: React.CSSProperties = {
    width: '36px',
    height: '4px',
    backgroundColor: '#dadce0',
    borderRadius: '2px'
};

const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 18px 12px',
    borderBottom: '1px solid #e8eaed'
};

const timelineContainerStyle: React.CSSProperties = {
    padding: '12px 18px',
    overflowY: 'auto',
    flex: 1,
    WebkitOverflowScrolling: 'touch' as any,
};

const buttonsStyle: React.CSSProperties = {
    padding: '10px 18px calc(16px + env(safe-area-inset-bottom, 0px))',
    borderTop: '1px solid #e8eaed',
    display: 'flex',
    gap: '10px'
};

const stopBtnStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px',
    backgroundColor: '#ea4335',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
};

const backBtnStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px',
    backgroundColor: 'white',
    color: '#1a73e8',
    border: '2px solid #1a73e8',
    borderRadius: '24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
};

const miniIconStyle: React.CSSProperties = { fontSize: '14px' };

const routeBadgeSmallStyle: React.CSSProperties = {
    color: 'white',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600'
};

const routeBadgeTinyStyle: React.CSSProperties = {
    color: 'white',
    padding: '1px 6px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: '600'
};
