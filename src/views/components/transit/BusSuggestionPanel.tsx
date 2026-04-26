/* BusSuggestionPanel — floating side panel showing route suggestions from GPS to searched destination */
import React from 'react';
import { TripOption } from '../../../models/transit/RoutePlanning';
import transitColors from '../../../models/data/transitColors';
import { BusSuggestionPanelProps } from '../../../models/components/BusSuggestionPanelProps';
import { useBusSuggestionController } from '../../../controllers/useBusSuggestionController';
import { computeDepartBy } from '../../../models/transit/TripSchedule';
import { DetourService } from '../../../models/services/DetourService';

// Pure view component — all GPS/route logic lives in useBusSuggestionController
export default function BusSuggestionPanel({ destination, onClose, onSelectRoute, liveBuses }: BusSuggestionPanelProps) {
    const { gpsLoading, gpsError, results, searching, handleRefresh } = useBusSuggestionController({ destination, liveBuses });

    // Arrive-by time planning (purely display — no recalculation needed)
    const [arriveByMode, setArriveByMode] = React.useState(false);
    const [arriveByTime, setArriveByTime] = React.useState('');

    return (
        <div className="bus-suggestion-panel" style={panelStyle}>
            {/* Drag handle for mobile */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0' }}>
                <div style={{ width: '36px', height: '4px', backgroundColor: '#dadce0', borderRadius: '2px' }} />
            </div>
            {/* Header */}
            <div style={headerStyle}>
                <div>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#202124' }}>
                        🚌 Bus Suggestions
                    </div>
                    <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '2px' }}>
                        To: {destination.name}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                        onClick={handleRefresh}
                        disabled={gpsLoading || searching}
                        title="Refresh suggestions"
                        style={{
                            background: 'none', border: '1px solid #dadce0', borderRadius: '50%',
                            width: '32px', height: '32px', cursor: gpsLoading || searching ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', color: '#5f6368', opacity: gpsLoading || searching ? 0.5 : 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        {gpsLoading || searching ? (
                            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span>
                        ) : '↻'}
                    </button>
                    <button onClick={onClose} style={closeBtnStyle}>✕</button>
                </div>
            </div>

            {/* Arrive-by time row */}
            <div style={{ padding: '8px 14px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: arriveByMode ? '#F1F8F2' : 'white' }}>
                <button
                    onClick={() => { setArriveByMode(m => !m); if (arriveByMode) setArriveByTime(''); }}
                    style={{
                        padding: '4px 10px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: '600',
                        backgroundColor: arriveByMode ? '#2E7D32' : '#f1f3f4',
                        color: arriveByMode ? 'white' : '#5f6368',
                        cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }}
                >
                    {arriveByMode ? '✓ Arrive by' : 'Plan for later'}
                </button>
                {arriveByMode && (
                    <input
                        type="time"
                        value={arriveByTime}
                        onChange={e => setArriveByTime(e.target.value)}
                        style={{
                            padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #2E7D32',
                            fontSize: '13px', fontWeight: '600', color: '#202124', outline: 'none',
                            backgroundColor: 'white',
                        }}
                        autoFocus
                    />
                )}
                {arriveByMode && arriveByTime && (
                    <span style={{ fontSize: '11px', color: '#2E7D32', fontWeight: '600' }}>
                        Shows depart-by times
                    </span>
                )}
            </div>

            {/* Content — loading, error, empty, or route cards */}
            <div style={contentStyle}>
                {gpsLoading && (
                    <div style={statusStyle}>
                        <div style={spinnerStyle} />
                        <span>Detecting your location...</span>
                    </div>
                )}

                {gpsError && (
                    <div style={errorStyle}>
                        {gpsError}
                        <button
                            onClick={handleRefresh}
                            style={{
                                marginLeft: '8px', background: 'none', border: '1px solid #d93025',
                                borderRadius: '6px', padding: '4px 12px', cursor: 'pointer',
                                fontSize: '12px', color: '#d93025', fontWeight: '600'
                            }}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {searching && !gpsLoading && (
                    <div style={statusStyle}>
                        <div style={spinnerStyle} />
                        <span>Finding routes...</span>
                    </div>
                )}

                {!searching && !gpsLoading && !gpsError && results.length === 0 && (
                    <div style={noResultsStyle}>
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>🤷</div>
                        <div style={{ fontWeight: '500', color: '#5f6368' }}>No routes found</div>
                        <div style={{ fontSize: '12px', color: '#80868b', marginTop: '4px' }}>
                            No transit routes connect your location to this destination
                        </div>
                    </div>
                )}

                {results.map((option, i) => (
                    <div key={i} onClick={() => onSelectRoute?.(option)} style={{ cursor: 'pointer' }}>
                        <RouteCard
                            option={option}
                            index={i}
                            arriveBy={arriveByMode && arriveByTime ? arriveByTime : undefined}
                        />
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @media (min-width: 641px) {
                    .bus-suggestion-panel {
                        position: fixed !important;
                        top: 55px !important;
                        bottom: auto !important;
                        right: 10px !important;
                        left: auto !important;
                        width: 380px !important;
                        max-height: calc(100vh - 70px) !important;
                        border-radius: 16px !important;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.18) !important;
                    }
                }
            `}</style>
        </div>
    );
}

// RouteCard — displays a single route option with timeline steps
function RouteCard({ option, index, arriveBy }: { option: TripOption; index: number; arriveBy?: string }) {
    const [expandedStops, setExpandedStops] = React.useState<Set<number>>(new Set());
    const [detouredRoutes, setDetouredRoutes] = React.useState<Set<string>>(new Set());

    // Check each segment's route for active detours
    React.useEffect(() => {
        let cancelled = false;
        const routeNums = [...new Set(option.segments.map(s => s.routeNum))];
        Promise.all(routeNums.map(async r => ({
            routeNum: r,
            hasDetour: await DetourService.hasActiveDetour(r),
        }))).then(results => {
            if (cancelled) return;
            const active = new Set(results.filter(r => r.hasDetour).map(r => r.routeNum));
            setDetouredRoutes(active);
        });
        return () => { cancelled = true; };
    }, [option]);

    const toggleStops = (segIndex: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedStops(prev => {
            const next = new Set(prev);
            if (next.has(segIndex)) next.delete(segIndex);
            else next.add(segIndex);
            return next;
        });
    };

    // Look up official transit color for a route number
    const getRouteColor = (routeNum: string): string => {
        const match = transitColors.find(c => c.route_id === parseInt(routeNum));
        return match ? match.colour : '#1a73e8';
    };

    return (
        <div style={{ ...cardStyle, borderLeft: `4px solid ${getRouteColor(option.segments[0]?.routeNum)}` }}>
            {index === 0 && (
                <div style={{
                    fontSize: '11px', fontWeight: '600', color: '#34a853',
                    backgroundColor: '#e6f4ea', padding: '3px 10px', borderRadius: '8px',
                    display: 'inline-block', marginBottom: '8px'
                }}>
                    ⭐ Recommended
                </div>
            )}

            {/* Header — route badges and total time */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {option.segments.map((seg, i) => (
                        <span key={i} style={{ ...routeBadgeStyle, backgroundColor: getRouteColor(seg.routeNum) }}>
                            Route {seg.routeNum}
                        </span>
                    ))}
                    {option.transfers === 0 ? (
                        <span style={directBadgeStyle}>✅ Direct</span>
                    ) : (
                        <span style={transferBadgeStyle}>🔄 {option.transfers} transfer</span>
                    )}
                    {detouredRoutes.size > 0 && (
                        <span
                            title={`Active detour on route ${[...detouredRoutes].join(', ')} — actual path may differ`}
                            style={{
                                fontSize: '11px', fontWeight: '600', color: '#b00020',
                                backgroundColor: '#fce4e6', padding: '3px 8px', borderRadius: '8px',
                            }}
                        >
                            ⚠️ Detour active
                        </span>
                    )}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: '700', fontSize: '16px', color: '#202124' }}>
                        {option.isLivePrediction && option.totalTimeWithWait
                            ? `~${option.totalTimeWithWait} min`
                            : `~${option.totalTime} min`
                        }
                    </span>
                    {option.estimatedArrival && (
                        <div style={{ fontSize: '11px', color: '#5f6368', marginTop: '2px' }}>
                            Arrive {option.estimatedArrival} · <span style={{ color: '#34a853', fontWeight: '600' }}>Live</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Depart-by banner — shown when arrive-by mode is active */}
            {arriveBy && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 10px', backgroundColor: '#E8F5E9', borderRadius: '8px',
                    marginBottom: '10px', fontSize: '12px', fontWeight: '600',
                }}>
                    <span style={{ fontSize: '14px' }}>🕐</span>
                    <span style={{ color: '#1B5E20' }}>
                        Leave by <strong>{computeDepartBy(arriveBy, option.totalTime)}</strong>
                        <span style={{ fontWeight: '400', color: '#2E7D32' }}> to arrive by {arriveBy}</span>
                    </span>
                </div>
            )}

            {/* Live ETA banner */}
            {option.isLivePrediction && option.waitTime !== undefined && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 10px', backgroundColor: '#e8f5e9', borderRadius: '8px',
                    marginBottom: '10px', fontSize: '12px', fontWeight: '500'
                }}>
                    <span style={{ fontSize: '14px' }}>🟢</span>
                    <span style={{ color: '#2e7d32' }}>
                        {option.waitTime <= 1
                            ? 'Bus arriving now!'
                            : `Next bus in ~${option.waitTime} min`
                        }
                        {option.segments[0]?.predTime && (
                            <span style={{ color: '#1a73e8', fontWeight: '600' }}>
                                {' '}· arrives {option.segments[0].predTime}
                            </span>
                        )}
                        {option.segments[0]?.busId && (
                            <span style={{ color: '#5f6368', fontWeight: '500' }}>
                                {' '}· Bus #{option.segments[0].busId}
                            </span>
                        )}
                    </span>
                </div>
            )}
            {!option.isLivePrediction && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 10px', backgroundColor: '#fff3e0', borderRadius: '8px',
                    marginBottom: '10px', fontSize: '12px', fontWeight: '500'
                }}>
                    <span style={{ fontSize: '14px' }}>⏱️</span>
                    <span style={{ color: '#e65100' }}>Estimated time (no live bus data)</span>
                </div>
            )}

            {/* Timeline — step-by-step route instructions */}
            <div style={{ fontSize: '13px', color: '#202124', position: 'relative', paddingLeft: '28px' }}>
                <div style={{
                    position: 'absolute', left: '9px', top: '10px', bottom: '10px',
                    width: '2px', backgroundColor: '#dadce0', borderRadius: '1px'
                }} />

                <div style={timelineStepStyle}>
                    <span style={timelineDotStyle('#34a853')} />
                    <span>Walk to <strong>{option.originStop}</strong> ({option.walkToFirstStop ?? option.walkingDistance}m)</span>
                </div>

                {option.segments.map((seg, i) => (
                    <div key={i}>
                        <div style={timelineStepStyle}>
                            <span style={timelineDotStyle(getRouteColor(seg.routeNum))} />
                            <span>
                                Board <strong style={{ color: getRouteColor(seg.routeNum) }}>Route {seg.routeNum}</strong>
                                <span style={{ color: '#5f6368' }}> ({seg.routeName})</span>
                                {seg.busId && (
                                    <span style={{
                                        marginLeft: '6px', fontSize: '11px', fontWeight: '600',
                                        color: '#1a73e8', backgroundColor: '#e8f0fe',
                                        padding: '1px 6px', borderRadius: '6px'
                                    }}>
                                        Bus #{seg.busId}
                                    </span>
                                )}
                            </span>
                        </div>

                        {/* Collapsible intermediate stops */}
                        {seg.intermediateStops && seg.intermediateStops.length > 0 && (
                            <div style={{ paddingLeft: '12px' }}>
                                <div
                                    onClick={(e) => toggleStops(i, e)}
                                    style={{
                                        ...timelineStepStyle,
                                        cursor: 'pointer',
                                        color: '#1a73e8',
                                        fontSize: '12px',
                                        userSelect: 'none'
                                    }}
                                >
                                    <span style={timelineSmallDotStyle} />
                                    <span style={{ fontWeight: '500' }}>
                                        {expandedStops.has(i) ? '▾' : '▸'} {seg.intermediateStops.length} stop{seg.intermediateStops.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                {expandedStops.has(i) && seg.intermediateStops.map((stopName, si) => (
                                    <div key={si} style={{
                                        ...timelineStepStyle,
                                        paddingLeft: '12px',
                                        color: '#5f6368',
                                        fontSize: '11px',
                                        padding: '2px 0'
                                    }}>
                                        <span style={{
                                            ...timelineSmallDotStyle,
                                            width: '4px', height: '4px',
                                            marginLeft: '-15px', marginTop: '6px'
                                        }} />
                                        <span>{stopName}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Ride time fallback when no intermediate stops */}
                        {!seg.intermediateStops || seg.intermediateStops.length === 0 ? (
                            <div style={{ ...timelineStepStyle, paddingLeft: '12px', color: '#5f6368', fontSize: '12px' }}>
                                <span style={timelineSmallDotStyle} />
                                <span>Ride ~{seg.estimatedTime} min</span>
                            </div>
                        ) : null}

                        <div style={timelineStepStyle}>
                            <span style={timelineDotStyle('#ea4335')} />
                            <span>Get off at <strong>{seg.toStop}</strong></span>
                        </div>

                        {/* Transfer section */}
                        {i < option.segments.length - 1 && (() => {
                            const nextSeg = option.segments[i + 1];
                            const isWalkTransfer = seg.toStop !== nextSeg?.fromStop;
                            return (
                                <div style={{
                                    ...timelineStepStyle,
                                    padding: '8px 0',
                                }}>
                                    <span style={timelineDotStyle('#e37400')} />
                                    <div style={{
                                        backgroundColor: '#fef7e0',
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        border: '1px solid #fdd835',
                                        flex: 1
                                    }}>
                                        <div style={{ fontWeight: '600', color: '#e37400', fontSize: '12px', marginBottom: '4px' }}>
                                            🔄 Transfer{isWalkTransfer ? '' : ` at ${seg.toStop}`}
                                        </div>
                                        {isWalkTransfer && option.transferWalkDistance && (
                                            <div style={{ fontSize: '11px', color: '#e37400', marginBottom: '4px' }}>
                                                🚶 Walk {option.transferWalkDistance}m to <strong>{nextSeg?.fromStop}</strong>
                                            </div>
                                        )}
                                        <div style={{ fontSize: '11px', color: '#5f6368' }}>
                                            Wait for <strong style={{ color: getRouteColor(option.segments[i + 1].routeNum) }}>
                                                Route {option.segments[i + 1].routeNum}
                                            </strong>
                                            <span> ({option.segments[i + 1].routeName})</span>
                                            {option.segments[i + 1]?.nextBusETA !== undefined ? (
                                                <span>
                                                    <span style={{ color: '#2e7d32', fontWeight: '600' }}>
                                                        {' '}· {option.segments[i + 1]!.nextBusETA! <= 1
                                                            ? 'Bus arriving now!'
                                                            : `Next bus in ~${option.segments[i + 1].nextBusETA} min`
                                                        }
                                                    </span>
                                                    {option.segments[i + 1].predTime && (
                                                        <span style={{ color: '#1a73e8', fontWeight: '600' }}>
                                                            {' '}· {option.segments[i + 1].predTime}
                                                        </span>
                                                    )}
                                                    {option.segments[i + 1].busId && (
                                                        <span style={{ color: '#5f6368' }}>
                                                            {' '}· Bus #{option.segments[i + 1].busId}
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span> · ~5 min wait</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                ))}

                <div style={timelineStepStyle}>
                    <span style={timelineDotStyle('#1a73e8')} />
                    <span>
                        Walk to your destination
                        {option.estimatedArrival && (
                            <span style={{ color: '#1a73e8', fontWeight: '600', marginLeft: '6px', fontSize: '12px' }}>
                                · ETA {option.estimatedArrival}
                            </span>
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
}

// -------- Styles --------

const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: 'auto',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    maxHeight: '70vh',
    backgroundColor: 'white',
    borderRadius: '20px 20px 0 0',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
    zIndex: 1500,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px 10px',
    borderBottom: '1px solid #e8eaed',
    backgroundColor: '#f8f9fa'
};

const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#5f6368',
    padding: '4px 8px',
    borderRadius: '50%'
};

const contentStyle: React.CSSProperties = {
    padding: '10px 14px',
    overflowY: 'auto',
    flex: 1,
    WebkitOverflowScrolling: 'touch' as any,
};

const statusStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px',
    fontSize: '14px',
    color: '#5f6368'
};

const cardStyle: React.CSSProperties = {
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    padding: '14px',
    marginBottom: '10px',
    transition: 'box-shadow 0.2s'
};

const routeBadgeStyle: React.CSSProperties = {
    color: 'white',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
};

const directBadgeStyle: React.CSSProperties = {
    color: '#137333',
    backgroundColor: '#e6f4ea',
    padding: '3px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '500'
};

const transferBadgeStyle: React.CSSProperties = {
    color: '#e37400',
    backgroundColor: '#fef7e0',
    padding: '3px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '500'
};

const timelineStepStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '5px 0',
    position: 'relative'
};

const timelineDotStyle = (color: string): React.CSSProperties => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: color,
    border: '2px solid white',
    boxShadow: '0 0 0 1px ' + color,
    flexShrink: 0,
    marginTop: '2px',
    marginLeft: '-22px',
    position: 'relative',
    zIndex: 1
});

const timelineSmallDotStyle: React.CSSProperties = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#dadce0',
    flexShrink: 0,
    marginTop: '5px',
    marginLeft: '-17px',
    position: 'relative',
    zIndex: 1
};

const noResultsStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '24px 16px'
};

const errorStyle: React.CSSProperties = {
    color: '#ea4335',
    fontSize: '13px',
    padding: '6px 10px',
    backgroundColor: '#fce8e6',
    borderRadius: '8px'
};

const spinnerStyle: React.CSSProperties = {
    width: '14px',
    height: '14px',
    border: '2px solid #dadce0',
    borderTop: '2px solid #1a73e8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    display: 'inline-block'
};
