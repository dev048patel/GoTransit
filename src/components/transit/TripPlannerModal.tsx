/**
 * TripPlannerModal
 * A modal overlay triggered from the Navbar's Trip Planner button.
 * - Origin: GPS auto-detect via browser geolocation
 * - Destination: Google Places autocomplete
 * - Results: Route suggestion cards from RoutePlanningService
 */
import React, { useState } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { RoutePlanningService } from '../../services/RoutePlanningService';
import { TripOption } from '../../models/transit/RoutePlanning';
import transitColors from '../../data/transitColors';
import { TripPlannerModalProps } from '../../models/components/TripPlannerModalProps';
import { LocationState } from '../../models/transit/LocationState';

const routePlanningService = new RoutePlanningService();

export default function TripPlannerModal({ isOpen, onClose, onSelectRoute, liveBuses }: TripPlannerModalProps) {
    const [origin, setOrigin] = useState<LocationState | null>(null);
    const [destination, setDestination] = useState<LocationState | null>(null);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [routeResults, setRouteResults] = useState<TripOption[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [showDestSuggestions, setShowDestSuggestions] = useState(false);

    // Google Places autocomplete for destination
    const {
        ready,
        value: destValue,
        suggestions: { status, data },
        setValue: setDestValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            location: new google.maps.LatLng(50.4452, -104.6189),
            radius: 50 * 1000,
        },
        debounce: 300,
    });

    if (!isOpen) return null;

    // Get user's GPS location
    const handleUseMyLocation = () => {
        setGpsLoading(true);
        setGpsError(null);

        if (!navigator.geolocation) {
            setGpsError('Geolocation not supported by your browser');
            setGpsLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setOrigin({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    label: `📍 My Location (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`
                });
                setGpsLoading(false);
                setRouteResults(null);
            },
            (error) => {
                setGpsError(`Unable to get location: ${error.message}`);
                setGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Handle destination place selection
    const handleDestSelect = async (description: string) => {
        setDestValue(description, false);
        clearSuggestions();
        setShowDestSuggestions(false);

        try {
            const results = await getGeocode({ address: description });
            const { lat, lng } = await getLatLng(results[0]);
            setDestination({ lat, lng, label: description });
            setRouteResults(null);
        } catch (error) {
            console.error('Error selecting destination:', error);
        }
    };

    // Find routes
    const handleFindRoutes = async () => {
        if (!origin || !destination) return;

        setSearching(true);
        setRouteResults(null);

        try {
            const results = await routePlanningService.calculateTripOptions(
                { lat: origin.lat, lng: origin.lng },
                { lat: destination.lat, lng: destination.lng },
                liveBuses
            );
            setRouteResults(results);

            // Track "directions" event for admin dashboard analytics
            const baseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
            fetch(`${baseUrl}/api/features/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'directions' }),
            }).catch(() => { }); // Silent fail — analytics should never break the app
        } catch (error) {
            console.error('Error finding routes:', error);
            setRouteResults([]);
        } finally {
            setSearching(false);
        }
    };

    // Reset form
    const handleClose = () => {
        setOrigin(null);
        setDestination(null);
        setRouteResults(null);
        setGpsError(null);
        setDestValue('', false);
        clearSuggestions();
        onClose();
    };

    return (
        <div style={overlayStyle} onClick={handleClose}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={headerStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '22px' }}>🗺️</span>
                        <span style={{ fontSize: '18px', fontWeight: '600', color: '#1a73e8' }}>Plan Your Trip</span>
                    </div>
                    <button onClick={handleClose} style={closeButtonStyle}>✕</button>
                </div>

                {/* Origin Section */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>From</label>
                    {origin ? (
                        <div style={locationDisplayStyle}>
                            <span style={{ flex: 1, fontSize: '14px', color: '#202124' }}>{origin.label}</span>
                            <button onClick={() => { setOrigin(null); setRouteResults(null); }} style={clearBtnStyle}>×</button>
                        </div>
                    ) : (
                        <button
                            onClick={handleUseMyLocation}
                            disabled={gpsLoading}
                            style={{
                                ...useLocationBtnStyle,
                                opacity: gpsLoading ? 0.6 : 1,
                                cursor: gpsLoading ? 'wait' : 'pointer'
                            }}
                        >
                            {gpsLoading ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={spinnerStyle} />
                                    Detecting location...
                                </span>
                            ) : (
                                <span>📍 Use My Location</span>
                            )}
                        </button>
                    )}
                    {gpsError && <div style={errorStyle}>{gpsError}</div>}
                </div>

                {/* Destination Section */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>To</label>
                    {destination ? (
                        <div style={locationDisplayStyle}>
                            <span style={{ flex: 1, fontSize: '14px', color: '#202124' }}>{destination.label}</span>
                            <button onClick={() => { setDestination(null); setDestValue('', false); setRouteResults(null); }} style={clearBtnStyle}>×</button>
                        </div>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Search for your destination..."
                                value={destValue}
                                onChange={(e) => { setDestValue(e.target.value); setShowDestSuggestions(true); }}
                                onFocus={() => data.length > 0 && setShowDestSuggestions(true)}
                                disabled={!ready}
                                style={inputStyle}
                            />
                            {showDestSuggestions && status === 'OK' && data.length > 0 && (
                                <div style={suggestionsDropdownStyle}>
                                    {data.map((suggestion) => {
                                        const { place_id, structured_formatting: { main_text, secondary_text } } = suggestion;
                                        return (
                                            <div
                                                key={place_id}
                                                onClick={() => handleDestSelect(suggestion.description)}
                                                style={suggestionItemStyle}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8f0fe'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                            >
                                                <div style={{ fontWeight: '500', color: '#202124', fontSize: '14px' }}>{main_text}</div>
                                                {secondary_text && (
                                                    <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '2px' }}>{secondary_text}</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Find Routes Button */}
                <button
                    onClick={handleFindRoutes}
                    disabled={!origin || !destination || searching}
                    style={{
                        ...findRoutesBtnStyle,
                        opacity: (!origin || !destination || searching) ? 0.5 : 1,
                        cursor: (!origin || !destination || searching) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {searching ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <span style={spinnerStyleWhite} />
                            Finding routes...
                        </span>
                    ) : (
                        '🚌 Find Routes'
                    )}
                </button>

                {/* Results Section */}
                {routeResults !== null && (
                    <div style={resultsContainerStyle}>
                        {routeResults.length === 0 ? (
                            <div style={noResultsStyle}>
                                <span style={{ fontSize: '32px' }}>🔍</span>
                                <p style={{ margin: '8px 0 0', color: '#5f6368', fontSize: '14px' }}>
                                    No routes found. Try locations closer to transit stops.
                                </p>
                            </div>
                        ) : (
                            routeResults.map((option, idx) => (
                                <div key={idx} onClick={() => onSelectRoute?.(option)} style={{ cursor: 'pointer' }}>
                                    <RouteCard option={option} index={idx} />
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

// --- Route Card Subcomponent ---
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

    // Look up actual transit color for each segment's route
    const getRouteColor = (routeNum: string): string => {
        const match = transitColors.find(c => c.route_id === parseInt(routeNum));
        return match ? match.colour : '#1a73e8';
    };
    const primaryColor = getRouteColor(option.segments[0]?.routeNum);

    return (
        <div style={{
            ...cardStyle,
            borderLeft: `4px solid ${primaryColor}`
        }}>
            {/* Recommended tag for first result */}
            {index === 0 && (
                <div style={{
                    fontSize: '11px', fontWeight: '600', color: '#34a853',
                    backgroundColor: '#e6f4ea', padding: '3px 10px', borderRadius: '8px',
                    display: 'inline-block', marginBottom: '8px'
                }}>
                    ⭐ Recommended
                </div>
            )}

            {/* Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {option.segments.map((seg, i) => (
                        <span key={i} style={{
                            ...routeBadgeStyle,
                            backgroundColor: getRouteColor(seg.routeNum)
                        }}>
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
                    {option.isLivePrediction && option.totalTimeWithWait
                        ? `~${option.totalTimeWithWait} min`
                        : `~${option.totalTime} min`
                    }
                </span>
            </div>

            {/* Live ETA info */}
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

            {/* Step-by-step instructions with timeline */}
            <div style={{ fontSize: '13px', color: '#202124', position: 'relative', paddingLeft: '28px' }}>
                {/* Vertical timeline line */}
                <div style={{
                    position: 'absolute', left: '9px', top: '10px', bottom: '10px',
                    width: '2px', backgroundColor: '#dadce0', borderRadius: '1px'
                }} />

                {/* Step 1: Walk to first stop */}
                <div style={timelineStepStyle}>
                    <span style={timelineDotStyle('#34a853')} />
                    <span>Walk to <strong>{option.originStop}</strong> ({option.walkingDistance}m)</span>
                </div>

                {/* Segments with board/ride/alight */}
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

                        {/* Ride info line (fallback when no intermediate stops) */}
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
                        {i < option.segments.length - 1 && (
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
                                        🔄 Transfer at {seg.toStop}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#5f6368' }}>
                                        Wait for <strong style={{ color: getRouteColor(option.segments[i + 1].routeNum) }}>
                                            Route {option.segments[i + 1].routeNum}
                                        </strong>
                                        <span> ({option.segments[i + 1].routeName})</span>
                                        <span> · ~5 min wait</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Final step: walk to destination */}
                <div style={timelineStepStyle}>
                    <span style={timelineDotStyle('#1a73e8')} />
                    <span>Walk to your destination</span>
                </div>
            </div>
        </div>
    );
}

// Dot indicator for stops
const dotStyle = (color: string): React.CSSProperties => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: color,
    display: 'inline-block',
    flexShrink: 0
});

// --- Styles ---
const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px'
};

const modalStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    padding: '24px'
};

const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e8eaed'
};

const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#5f6368',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '50%',
    lineHeight: 1
};

const sectionStyle: React.CSSProperties = {
    marginBottom: '16px'
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#5f6368',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px'
};

const locationDisplayStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#e8f0fe',
    borderRadius: '10px',
    padding: '10px 14px',
    gap: '8px'
};

const clearBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    color: '#5f6368',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1
};

const useLocationBtnStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    border: '2px dashed #dadce0',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a73e8',
    cursor: 'pointer',
    transition: 'all 0.2s'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: '2px solid #dadce0',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    color: '#202124',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
};

const suggestionsDropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 2001
};

const suggestionItemStyle: React.CSSProperties = {
    padding: '10px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid #f1f3f4',
    transition: 'background-color 0.15s'
};

const findRoutesBtnStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    backgroundColor: '#1a73e8',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '16px'
};

const resultsContainerStyle: React.CSSProperties = {
    borderTop: '1px solid #e8eaed',
    paddingTop: '16px'
};

const noResultsStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '24px 16px'
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

const transferBadgeStyle: React.CSSProperties = {
    color: '#e37400',
    backgroundColor: '#fef7e0',
    padding: '3px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '500'
};

const directBadgeStyle: React.CSSProperties = {
    color: '#137333',
    backgroundColor: '#e6f4ea',
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

const errorStyle: React.CSSProperties = {
    color: '#ea4335',
    fontSize: '13px',
    marginTop: '6px',
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

const spinnerStyleWhite: React.CSSProperties = {
    ...spinnerStyle,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white'
};
