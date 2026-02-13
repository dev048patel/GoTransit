/**
 * TripPlannerModal
 * A modal overlay triggered from the Navbar's Trip Planner button.
 * - Origin: GPS auto-detect via browser geolocation
 * - Destination: Google Places autocomplete
 * - Results: Route suggestion cards from RoutePlanningService
 */
import React, { useState } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { RoutePlanningService } from '../services/RoutePlanningService';
import { TripOption } from '../models/RoutePlanning';

interface TripPlannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectRoute?: (option: TripOption) => void;
}

interface LocationState {
    lat: number;
    lng: number;
    label: string;
}

const routePlanningService = new RoutePlanningService();

export default function TripPlannerModal({ isOpen, onClose, onSelectRoute }: TripPlannerModalProps) {
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
                { lat: destination.lat, lng: destination.lng }
            );
            setRouteResults(results);
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
    const routeColors = ['#1a73e8', '#ea4335', '#34a853', '#fbbc04', '#9334e6'];
    const cardColor = routeColors[index % routeColors.length];

    return (
        <div style={{
            ...cardStyle,
            borderLeft: `4px solid ${cardColor}`
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
                            backgroundColor: cardColor
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
                    ~{option.totalTime} min
                </span>
            </div>

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
                        {/* Transfer instruction */}
                        {i < option.segments.length - 1 && (
                            <div style={{ ...timelineStepStyle, color: '#e37400', fontWeight: '500' }}>
                                <span style={timelineDotStyle('#e37400')} />
                                <span>Transfer — wait for next bus at this stop</span>
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
