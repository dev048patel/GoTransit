/**
 * BusSuggestionPanel
 * Floating side panel triggered when user clicks "Yes" on the search marker popup.
 * - Detects GPS origin automatically
 * - Calls RoutePlanningService with GPS origin → searched destination
 * - Displays route suggestions using timeline route cards
 */
import React, { useState, useEffect, useCallback } from 'react';
import { RoutePlanningService } from '../services/RoutePlanningService';
import { TripOption } from '../models/RoutePlanning';

interface BusSuggestionPanelProps {
    destination: { lat: number; lng: number; name: string };
    onClose: () => void;
    onSelectRoute?: (option: TripOption) => void;
}

const routePlanningService = new RoutePlanningService();

export default function BusSuggestionPanel({ destination, onClose, onSelectRoute }: BusSuggestionPanelProps) {
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
        if (!origin) return;
        setSearching(true);
        try {
            const options = await routePlanningService.calculateTripOptions(
                origin,
                { lat: destination.lat, lng: destination.lng }
            );
            setResults(options);
        } catch (err) {
            console.error('[BusSuggestionPanel] Error:', err);
        }
        setSearching(false);
    }, [origin, destination]);

    useEffect(() => {
        if (origin) findRoutes();
    }, [origin, findRoutes]);

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
                <button onClick={onClose} style={closeBtnStyle}>✕</button>
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
                    <div style={errorStyle}>{gpsError}</div>
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
    const routeColors = ['#1a73e8', '#ea4335', '#34a853', '#fbbc04', '#9334e6'];
    const cardColor = routeColors[index % routeColors.length];

    return (
        <div style={{ ...cardStyle, borderLeft: `4px solid ${cardColor}` }}>
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
                    {option.segments.map((seg, i) => (
                        <span key={i} style={{ ...routeBadgeStyle, backgroundColor: cardColor }}>
                            Route {seg.routeNum}
                        </span>
                    ))}
                    {option.transfers === 0 ? (
                        <span style={directBadgeStyle}>✅ Direct</span>
                    ) : (
                        <span style={transferBadgeStyle}>🔄 {option.transfers} transfer</span>
                    )}
                </div>
                <span style={{ fontWeight: '700', fontSize: '16px', color: '#202124' }}>
                    ~{option.totalTime} min
                </span>
            </div>

            {/* Timeline */}
            <div style={{ fontSize: '13px', color: '#202124', position: 'relative', paddingLeft: '28px' }}>
                <div style={{
                    position: 'absolute', left: '9px', top: '10px', bottom: '10px',
                    width: '2px', backgroundColor: '#dadce0', borderRadius: '1px'
                }} />

                <div style={timelineStepStyle}>
                    <span style={timelineDotStyle('#34a853')} />
                    <span>Walk to <strong>{option.originStop}</strong> ({option.walkingDistance}m)</span>
                </div>

                {option.segments.map((seg, i) => (
                    <div key={i}>
                        <div style={timelineStepStyle}>
                            <span style={timelineDotStyle(cardColor)} />
                            <span>
                                Board <strong style={{ color: cardColor }}>Route {seg.routeNum}</strong>
                                <span style={{ color: '#5f6368' }}> ({seg.routeName})</span>
                            </span>
                        </div>
                        <div style={{ ...timelineStepStyle, paddingLeft: '12px', color: '#5f6368', fontSize: '12px' }}>
                            <span style={timelineSmallDotStyle} />
                            <span>{seg.fromStop} → {seg.toStop} · ~{seg.estimatedTime} min</span>
                        </div>
                        <div style={timelineStepStyle}>
                            <span style={timelineDotStyle('#ea4335')} />
                            <span>Get off at <strong>{seg.toStop}</strong></span>
                        </div>
                        {i < option.segments.length - 1 && (
                            <div style={{ ...timelineStepStyle, color: '#e37400', fontWeight: '500' }}>
                                <span style={timelineDotStyle('#e37400')} />
                                <span>Transfer — wait for next bus at this stop</span>
                            </div>
                        )}
                    </div>
                ))}

                <div style={timelineStepStyle}>
                    <span style={timelineDotStyle('#1a73e8')} />
                    <span>Walk to your destination</span>
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
