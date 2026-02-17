/**
 * TrackingPanel
 * Bottom panel displayed when route tracking is active.
 * Shows trip summary, step-by-step timeline with colored left border,
 * and a Stop Tracking button.
 */
import React from 'react';
import { TrackingPanelProps } from '../../models/transit/Planner';

export default function TrackingPanel({ tripOption, onStopTracking }: TrackingPanelProps) {
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + tripOption.totalTime * 60000);
    const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    const routeColors = ['#1a73e8', '#9334e6', '#ea4335', '#34a853'];

    return (
        <div className="absolute bottom-0 left-0 right-0 max-h-[55vh] bg-white rounded-t-[20px] shadow-[0_-4px_24px_rgba(0,0,0,0.15)] z-[1500] flex flex-col overflow-hidden">
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1"><div className="w-9 h-1 bg-[#dadce0] rounded-sm" /></div>

            {/* Header */}
            <div className="flex justify-between items-center px-[18px] pt-1 pb-3 border-b border-[#e8eaed]">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🚌</span>
                    <div>
                        <div className="font-bold text-lg text-[#202124]">
                            {tripOption.totalTime} min
                        </div>
                        <div className="text-xs text-[#5f6368]">
                            Arrive {formatTime(arrivalTime)}
                        </div>
                    </div>
                </div>
                {/* Route summary icons */}
                <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-sm">🚶</span>
                    {tripOption.segments.map((seg, i) => (
                        <React.Fragment key={i}>
                            <span className="text-[#5f6368] text-xs">›</span>
                            <span
                                className="text-white px-2 py-0.5 rounded-[10px] text-[11px] font-semibold"
                                style={{ backgroundColor: routeColors[i % routeColors.length] }}
                            >
                                {seg.routeNum}
                            </span>
                        </React.Fragment>
                    ))}
                    <span className="text-[#5f6368] text-xs">›</span>
                    <span className="text-sm">🚶</span>
                </div>
            </div>

            {/* Step-by-step timeline */}
            <div className="px-[18px] py-3 overflow-y-auto flex-1">
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
                                    <span className="flex items-center gap-1.5">
                                        <span className="text-white px-1.5 py-px rounded-lg text-[10px] font-semibold" style={{ backgroundColor: segColor }}>{seg.routeNum}</span>
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
            <div className="px-[18px] pt-2.5 pb-4 border-t border-[#e8eaed] flex gap-2.5">
                <button onClick={onStopTracking} className="flex-1 p-3 bg-[#ea4335] text-white border-none rounded-3xl text-sm font-semibold cursor-pointer">
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
        <div className="flex items-stretch" style={{ minHeight: small ? '28px' : '48px' }}>
            {/* Left timeline column */}
            <div className="w-8 flex flex-col items-center shrink-0">
                {/* Dot */}
                {small ? (
                    <div
                        className="w-2 h-2 rounded-full mt-2 shrink-0"
                        style={{ backgroundColor: color }}
                    />
                ) : (
                    <div
                        className="w-3.5 h-3.5 rounded-full border-2 border-white shrink-0 mt-1"
                        style={{ backgroundColor: color, boxShadow: `0 0 0 1px ${color}` }}
                    />
                )}
                {/* Line */}
                {!last && (
                    <div
                        className="flex-1 mt-0.5 rounded-sm"
                        style={{
                            width: lineThick ? '4px' : '2px',
                            backgroundColor: dashed ? 'transparent' : lineColor,
                            backgroundImage: dashed ? `linear-gradient(${lineColor} 50%, transparent 50%)` : 'none',
                            backgroundSize: dashed ? '2px 8px' : 'auto',
                            backgroundRepeat: 'repeat-y'
                        }}
                    />
                )}
            </div>

            {/* Content */}
            <div className={`flex-1 pl-2.5 flex justify-between items-start ${small ? 'pb-1' : 'pb-3'}`}>
                <div>
                    <div className={`flex items-center gap-1.5 ${small ? 'text-xs text-[#5f6368]' : 'text-sm font-medium text-[#202124]'}`}>
                        {icon && <span className={small ? 'text-xs' : 'text-sm'}>{icon}</span>}
                        <span>{title}</span>
                    </div>
                    {subtitle && (
                        <div className="text-xs text-[#5f6368] mt-0.5">
                            {subtitle}
                        </div>
                    )}
                </div>
                {time && (
                    <div className="text-[13px] font-semibold text-[#202124] whitespace-nowrap ml-2">
                        {time}
                    </div>
                )}
            </div>
        </div>
    );
}


