/**
 * BusSuggestionPanel
 * Floating side panel triggered when user clicks "Yes" on the search marker popup.
 * - Detects GPS origin automatically
 * - Calls RoutePlanningService with GPS origin → searched destination
 * - Displays route suggestions using timeline route cards
 */
import React, { useState, useEffect, useCallback } from 'react';
import { RoutePlanningService } from '../../services/RoutePlanningService';
import { TripOption } from '../../models/transit/RoutePlanning';
import transitColors from '../../data/transitColors';
import { BusSuggestionPanelProps } from '../../models/components/BusSuggestionPanelProps';

const routePlanningService = new RoutePlanningService();

export default function BusSuggestionPanel({ destination, onClose, onSelectRoute, liveBuses }: BusSuggestionPanelProps) {
    const [gpsLoading, setGpsLoading] = useState(true);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
    const [results, setResults] = useState<TripOption[]>([]);
    const [searching, setSearching] = useState(false);

    // Step 1: Get GPS on mount
    useEffect(() => {
        if (!navigator.geolocation) {
            setGpsError('Geolocation not supported');
            setGpsLoading(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGpsLoading(false);
            },
            (err) => {
                setGpsError(`GPS error: ${err.message}`);
                setGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    // Step 2: Calculate routes when GPS is ready
    const findRoutes = useCallback(async () => {
        if (!origin) return;  // if no origin return nothing
        setSearching(true); // searching true
        try {
            const options = await routePlanningService.calculateTripOptions( // calculate trip options
                origin,
                { lat: destination.lat, lng: destination.lng },
                liveBuses
            );
            setResults(options); // set results
        } catch (err) {
            console.error('[BusSuggestionPanel] Error:', err);
        }
        setSearching(false); // searching false
    }, [origin, destination, liveBuses]); // saving all the values

    useEffect(() => {
        if (origin) findRoutes(); // if origin then find routes
    }, [origin, findRoutes]);

    // Refresh: re-fetch GPS + recalculate routes
    const handleRefresh = useCallback(() => {
        setGpsError(null);
        setGpsLoading(true);
        setResults([]);
        if (!navigator.geolocation) { // if geolocation not supported
            setGpsError('Geolocation not supported');
            setGpsLoading(false);
            return;
        }
        navigator.geolocation.getCurrentPosition( // updating the origin location
            (pos) => {
                const newOrigin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setOrigin(newOrigin);
                setGpsLoading(false);
            },
            (err) => {
                setGpsError(`GPS error: ${err.message}`);
                setGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 } // timeout 10 seconds
        );
    }, []);

    return (
        <div style={panelStyle}>
            {/* Header */}
            <div style={headerStyle}>
                <div>
                    <div style={{ fontWeight: '700', fontSize: '16px', color: '#202124' }}>
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

            {/* Content */}
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

                {!searching && !gpsLoading && !gpsError && results.length === 0 && ( // if no result found
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
                        <RouteCard option={option} index={i} />
                    </div>
                ))}
            </div>

            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// --- RouteCard (same timeline design as TripPlannerModal) ---
function RouteCard({ option, index }: { option: TripOption; index: number }) {
    const [expandedStops, setExpandedStops] = React.useState<Set<number>>(new Set());

    const toggleStops = (segIndex: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedStops(prev => {
            const next = new Set(prev);
            if (next.has(segIndex)) next.delete(segIndex);
            else next.add(segIndex);
            return next;
        });
    };

    // Look up actual transit color for the first segment's route
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

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {option.segments.map((seg, i) => ( // mapping Routes
                        <span key={i} style={{ ...routeBadgeStyle, backgroundColor: getRouteColor(seg.routeNum) }}>
                            Route {seg.routeNum}
                        </span>
                    ))}
                    {option.transfers === 0 ? ( // if no transfers direct route
                        <span style={directBadgeStyle}>✅ Direct</span>
                    ) : (
                        <span style={transferBadgeStyle}>🔄 {option.transfers} transfer</span>
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

            {/* Live ETA info */}
            {option.isLivePrediction && option.waitTime !== undefined && ( // there are some problems.
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 10px', backgroundColor: '#e8f5e9', borderRadius: '8px',
                    marginBottom: '10px', fontSize: '12px', fontWeight: '500'
                }}>
                    <span style={{ fontSize: '14px' }}>🟢</span>
                    <span style={{ color: '#2e7d32' }}>
                        {option.waitTime <= 1  // if waitTime is less than 1 min it is arriving now
                            ? 'Bus arriving now!'
                            : `Next bus in ~${option.waitTime} min`
                        }
                        {option.segments[0]?.predTime && ( // if bus is in arriving in more than 1 min
                            <span style={{ color: '#1a73e8', fontWeight: '600' }}>
                                {' '}· arrives {option.segments[0].predTime}
                            </span>
                        )}
                        {option.segments[0]?.busId && ( // 
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

            {/* Timeline */}
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

                        {/* Intermediate stops - collapsible */}
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

                        {/* Ride info line */}
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

                        {/* Transfer section - enhanced */}
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
    position: 'absolute',
    top: '55px',
    right: '10px',
    width: '380px',
    maxHeight: 'calc(100vh - 70px)',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    zIndex: 1500,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
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
    padding: '14px',
    overflowY: 'auto',
    flex: 1
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
