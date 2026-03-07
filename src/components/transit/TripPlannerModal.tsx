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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-5" onClick={handleClose}>
            <div className="bg-white rounded-2xl w-full max-w-[480px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-6" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center mb-5 pb-4 border-b border-[#e8eaed]">
                    <div className="flex items-center gap-2.5">
                        <span className="text-[22px]">🗺️</span>
                        <span className="text-lg font-semibold text-[#1a73e8]">Plan Your Trip</span>
                    </div>
                    <button onClick={handleClose} className="bg-transparent border-none text-xl text-[#5f6368] cursor-pointer px-2 py-1 rounded-full leading-none">✕</button>
                </div>

                {/* Origin Section */}
                <div className="mb-4">
                    <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-[0.5px] mb-1.5">From</label>
                    {origin ? (
                        <div className="flex items-center bg-[#e8f0fe] rounded-[10px] px-3.5 py-2.5 gap-2">
                            <span className="flex-1 text-sm text-[#202124]">{origin.label}</span>
                            <button onClick={() => { setOrigin(null); setRouteResults(null); }} className="bg-transparent border-none text-lg text-[#5f6368] cursor-pointer px-1 py-0 leading-none">×</button>
                        </div>
                    ) : (
                        <button
                            onClick={handleUseMyLocation}
                            disabled={gpsLoading}
                            className={`w-full p-3 bg-[#f8f9fa] border-2 border-dashed border-[#dadce0] rounded-[10px] text-sm font-medium text-[#1a73e8] cursor-pointer transition-all duration-200 ${gpsLoading ? 'opacity-60 cursor-wait' : ''}`}
                        >
                            {gpsLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="inline-block w-3.5 h-3.5 border-2 border-[#dadce0] border-t-[#1a73e8] rounded-full animate-spin" />
                                    Detecting location...
                                </span>
                            ) : (
                                <span>📍 Use My Location</span>
                            )}
                        </button>
                    )}
                    {gpsError && <div className="text-[#ea4335] text-[13px] mt-1.5 px-2.5 py-1.5 bg-[#fce8e6] rounded-lg">{gpsError}</div>}
                </div>

                {/* Destination Section */}
                <div className="mb-4">
                    <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-[0.5px] mb-1.5">To</label>
                    {destination ? (
                        <div className="flex items-center bg-[#e8f0fe] rounded-[10px] px-3.5 py-2.5 gap-2">
                            <span className="flex-1 text-sm text-[#202124]">{destination.label}</span>
                            <button onClick={() => { setDestination(null); setDestValue('', false); setRouteResults(null); }} className="bg-transparent border-none text-lg text-[#5f6368] cursor-pointer px-1 py-0 leading-none">×</button>
                        </div>
                    ) : (
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search for your destination..."
                                value={destValue}
                                onChange={(e) => { setDestValue(e.target.value); setShowDestSuggestions(true); }}
                                onFocus={() => data.length > 0 && setShowDestSuggestions(true)}
                                disabled={!ready}
                                className="w-full px-3.5 py-3 border-2 border-[#dadce0] rounded-[10px] text-sm outline-none text-[#202124] box-border transition-colors duration-200"
                            />
                            {showDestSuggestions && status === 'OK' && data.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.15)] max-h-[200px] overflow-y-auto z-[2001]">
                                    {data.map((suggestion) => {
                                        const { place_id, structured_formatting: { main_text, secondary_text } } = suggestion;
                                        return (
                                            <div
                                                key={place_id}
                                                onClick={() => handleDestSelect(suggestion.description)}
                                                className="px-3.5 py-2.5 cursor-pointer border-b border-[#f1f3f4] transition-colors duration-150 hover:bg-[#e8f0fe]"
                                            >
                                                <div className="font-medium text-[#202124] text-sm">{main_text}</div>
                                                {secondary_text && (
                                                    <div className="text-xs text-[#5f6368] mt-0.5">{secondary_text}</div>
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
                    className={`w-full p-3.5 bg-[#1a73e8] text-white border-none rounded-xl text-[15px] font-semibold cursor-pointer transition-all duration-200 mb-4 ${(!origin || !destination || searching) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {searching ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Finding routes...
                        </span>
                    ) : (
                        '🚌 Find Routes'
                    )}
                </button>

                {/* Results Section */}
                {routeResults !== null && (
                    <div className="border-t border-[#e8eaed] pt-4">
                        {routeResults.length === 0 ? (
                            <div className="text-center px-4 py-6">
                                <span className="text-[32px]">🔍</span>
                                <p className="mt-2 mb-0 text-[#5f6368] text-sm">
                                    No routes found. Try locations closer to transit stops.
                                </p>
                            </div>
                        ) : (
                            routeResults.map((option, idx) => (
                                <div key={idx} onClick={() => onSelectRoute?.(option)} className="cursor-pointer">
                                    <RouteCard option={option} index={idx} />
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
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
        <div className="bg-[#f8f9fa] rounded-xl p-3.5 mb-2.5 transition-shadow duration-200 border-l-4" style={{ borderLeftColor: primaryColor }}>
            {/* Recommended tag for first result */}
            {index === 0 && (
                <div className="text-[11px] font-semibold text-[#34a853] bg-[#e6f4ea] px-2.5 py-[3px] rounded-lg inline-block mb-2">
                    ⭐ Recommended
                </div>
            )}

            {/* Card Header */}
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {option.segments.map((seg, i) => (
                        <span key={i} className="text-white px-2.5 py-[3px] rounded-xl text-xs font-semibold" style={{ backgroundColor: getRouteColor(seg.routeNum) }}>
                            Route {seg.routeNum}
                        </span>
                    ))}
                    {option.transfers === 0 ? (
                        <span className="text-[#137333] bg-[#e6f4ea] px-2 py-[3px] rounded-[10px] text-[11px] font-medium">✅ Direct</span>
                    ) : (
                        <span className="text-[#e37400] bg-[#fef7e0] px-2 py-[3px] rounded-[10px] text-[11px] font-medium">🔄 {option.transfers} transfer</span>
                    )}
                </div>
                <span className="font-bold text-base text-[#202124]">
                    {option.isLivePrediction && option.totalTimeWithWait
                        ? `~${option.totalTimeWithWait} min`
                        : `~${option.totalTime} min`
                    }
                </span>
            </div>

            {/* Live ETA info */}
            {option.isLivePrediction && option.waitTime !== undefined && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#e8f5e9] rounded-lg mb-2.5 text-xs font-medium">
                    <span className="text-sm">🟢</span>
                    <span className="text-[#2e7d32]">
                        {option.waitTime <= 1
                            ? 'Bus arriving now!'
                            : `Next bus in ~${option.waitTime} min`
                        }
                        {option.segments[0]?.predTime && (
                            <span className="text-[#1a73e8] font-semibold">
                                {' '}· arrives {option.segments[0].predTime}
                            </span>
                        )}
                        {option.segments[0]?.busId && (
                            <span className="text-[#5f6368] font-medium">
                                {' '}· Bus #{option.segments[0].busId}
                            </span>
                        )}
                    </span>
                </div>
            )}
            {!option.isLivePrediction && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#fff3e0] rounded-lg mb-2.5 text-xs font-medium">
                    <span className="text-sm">⏱️</span>
                    <span className="text-[#e65100]">Estimated time (no live bus data)</span>
                </div>
            )}

            {/* Step-by-step instructions with timeline */}
            <div className="text-[13px] text-[#202124] relative pl-7">
                {/* Vertical timeline line */}
                <div className="absolute left-[9px] top-2.5 bottom-2.5 w-0.5 bg-[#dadce0] rounded-sm" />

                {/* Step 1: Walk to first stop */}
                <div className="flex items-start gap-2.5 py-[5px] relative">
                    <span className="w-3 h-3 rounded-full border-2 border-white shrink-0 mt-0.5 -ml-[22px] relative z-[1]" style={{ backgroundColor: '#34a853', boxShadow: '0 0 0 1px #34a853' }} />
                    <span>Walk to <strong>{option.originStop}</strong> ({option.walkingDistance}m)</span>
                </div>

                {/* Segments with board/ride/alight */}
                {option.segments.map((seg, i) => {
                    const routeColor = getRouteColor(seg.routeNum);
                    return (
                    <div key={i}>
                        <div className="flex items-start gap-2.5 py-[5px] relative">
                            <span className="w-3 h-3 rounded-full border-2 border-white shrink-0 mt-0.5 -ml-[22px] relative z-[1]" style={{ backgroundColor: routeColor, boxShadow: `0 0 0 1px ${routeColor}` }} />
                            <span>
                                Board <strong style={{ color: routeColor }}>Route {seg.routeNum}</strong>
                                <span className="text-[#5f6368]"> ({seg.routeName})</span>
                                {seg.busId && (
                                    <span className="ml-1.5 text-[11px] font-semibold text-[#1a73e8] bg-[#e8f0fe] px-1.5 py-px rounded-md">
                                        Bus #{seg.busId}
                                    </span>
                                )}
                            </span>
                        </div>

                        {/* Intermediate stops - collapsible */}
                        {seg.intermediateStops && seg.intermediateStops.length > 0 && (
                            <div className="pl-3">
                                <div
                                    onClick={(e) => toggleStops(i, e)}
                                    className="flex items-start gap-2.5 py-[5px] relative cursor-pointer text-[#1a73e8] text-xs select-none"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#dadce0] shrink-0 mt-[5px] -ml-[17px] relative z-[1]" />
                                    <span className="font-medium">
                                        {expandedStops.has(i) ? '▾' : '▸'} {seg.intermediateStops.length} stop{seg.intermediateStops.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                {expandedStops.has(i) && seg.intermediateStops.map((stopName, si) => (
                                    <div key={si} className="flex items-start gap-2.5 py-0.5 relative pl-3 text-[#5f6368] text-[11px]">
                                        <span className="w-1 h-1 rounded-full bg-[#dadce0] shrink-0 mt-1.5 -ml-[15px] relative z-[1]" />
                                        <span>{stopName}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Ride info line (fallback when no intermediate stops) */}
                        {!seg.intermediateStops || seg.intermediateStops.length === 0 ? (
                            <div className="flex items-start gap-2.5 py-[5px] relative pl-3 text-[#5f6368] text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#dadce0] shrink-0 mt-[5px] -ml-[17px] relative z-[1]" />
                                <span>Ride ~{seg.estimatedTime} min</span>
                            </div>
                        ) : null}

                        <div className="flex items-start gap-2.5 py-[5px] relative">
                            <span className="w-3 h-3 rounded-full border-2 border-white shrink-0 mt-0.5 -ml-[22px] relative z-[1]" style={{ backgroundColor: '#ea4335', boxShadow: '0 0 0 1px #ea4335' }} />
                            <span>Get off at <strong>{seg.toStop}</strong></span>
                        </div>

                        {/* Transfer section - enhanced */}
                        {i < option.segments.length - 1 && (
                            <div className="flex items-start gap-2.5 py-2 relative">
                                <span className="w-3 h-3 rounded-full border-2 border-white shrink-0 mt-0.5 -ml-[22px] relative z-[1]" style={{ backgroundColor: '#e37400', boxShadow: '0 0 0 1px #e37400' }} />
                                <div className="bg-[#fef7e0] rounded-lg px-3 py-2 border border-[#fdd835] flex-1">
                                    <div className="font-semibold text-[#e37400] text-xs mb-1">
                                        🔄 Transfer at {seg.toStop}
                                    </div>
                                    <div className="text-[11px] text-[#5f6368]">
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
                    );
                })}

                {/* Final step: walk to destination */}
                <div className="flex items-start gap-2.5 py-[5px] relative">
                    <span className="w-3 h-3 rounded-full border-2 border-white shrink-0 mt-0.5 -ml-[22px] relative z-[1]" style={{ backgroundColor: '#1a73e8', boxShadow: '0 0 0 1px #1a73e8' }} />
                    <span>Walk to your destination</span>
                </div>
            </div>
        </div>
    );
}
