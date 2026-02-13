/**
 * TrackingPanel
 * Bottom panel displayed when route tracking is active.
 * Shows trip summary, step-by-step timeline with colored left border,
 * and a Stop Tracking button.
 */
import React from 'react';
import { TripOption } from '../models/RoutePlanning';

interface TrackingPanelProps {
    tripOption: TripOption;
    onStopTracking: () => void;
}

export default function TrackingPanel({ tripOption, onStopTracking }: TrackingPanelProps) {
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + tripOption.totalTime * 60000);
    const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    const routeColors = ['#1a73e8', '#9334e6', '#ea4335', '#34a853'];

    return (
        <div style={panelStyle}>
            {/* Drag handle */}
            <div style={handleBarStyle}><div style={handleStyle} /></div>

            {/* Header */}
            <div style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🚌</span>
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '18px', color: '#202124' }}>
                            {tripOption.totalTime} min
                        </div>
                        <div style={{ fontSize: '12px', color: '#5f6368' }}>
                            Arrive {formatTime(arrivalTime)}
                        </div>
                    </div>
                </div>
                {/* Route summary icons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    <span style={miniIconStyle}>🚶</span>
                    {tripOption.segments.map((seg, i) => (
                        <React.Fragment key={i}>
                            <span style={{ color: '#5f6368', fontSize: '12px' }}>›</span>
                            <span style={{
                                ...routeBadgeSmallStyle,
                                backgroundColor: routeColors[i % routeColors.length]
                            }}>
                                {seg.routeNum}
                            </span>
                        </React.Fragment>
                    ))}
                    <span style={{ color: '#5f6368', fontSize: '12px' }}>›</span>
                    <span style={miniIconStyle}>🚶</span>
                </div>
            </div>

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
                    title={`Walk ${tripOption.walkingDistance}m`}
                    subtitle={`to ${tripOption.segments[0].fromStop}`}
                    time=""
                    lineColor="#5f6368"
                    dashed
                />

                {/* Bus segments */}
                {tripOption.segments.map((seg, i) => {
                    const segColor = routeColors[i % routeColors.length];
                    const boardTime = new Date(now.getTime() + (i === 0 ?
                        Math.round((tripOption.walkingDistance / 1000) / 5 * 60) : // walk time
                        tripOption.segments.slice(0, i).reduce((acc, s) => acc + s.estimatedTime, 0) + 5 // + transfer wait
                    ) * 60000);

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
                            {i < tripOption.segments.length - 1 && (
                                <TimelineStep
                                    color="#e37400"
                                    icon="🔄"
                                    title="Transfer"
                                    subtitle="Wait for next bus (~5 min)"
                                    time=""
                                    lineColor="#e37400"
                                    dashed
                                />
                            )}
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

            {/* Buttons */}
            <div style={buttonsStyle}>
                <button onClick={onStopTracking} style={stopBtnStyle}>
                    Stop Tracking
                </button>
            </div>
        </div>
    );
}

// --- TimelineStep sub-component ---
function TimelineStep({ color, icon, title, subtitle, time, lineColor, dashed, small, lineThick, last }: {
    color: string; icon: string; title: string; subtitle: React.ReactNode; time: string;
    lineColor: string; dashed: boolean; small?: boolean; lineThick?: boolean; last?: boolean;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'stretch', minHeight: small ? '28px' : '48px' }}>
            {/* Left timeline column */}
            <div style={{ width: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                {/* Dot */}
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
                {/* Line */}
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
                <div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: small ? '12px' : '14px',
                        fontWeight: small ? '400' : '500',
                        color: small ? '#5f6368' : '#202124'
                    }}>
                        {icon && <span style={{ fontSize: small ? '12px' : '14px' }}>{icon}</span>}
                        <span>{title}</span>
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
    flex: 1
};

const buttonsStyle: React.CSSProperties = {
    padding: '10px 18px 16px',
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
    cursor: 'pointer'
};

const miniIconStyle: React.CSSProperties = {
    fontSize: '14px'
};

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
