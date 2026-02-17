/**
 * TripPlannerModal
 * A modal overlay triggered from the Navbar's Trip Planner button.
 * - Origin: GPS auto-detect via browser geolocation
 * - Destination: Google Places autocomplete
 * - Results: Route suggestion cards from RoutePlanningService
 */
import { useState } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { RoutePlanningService } from '../../services/RoutePlanningService';
import { TripOption, LocationState, TripPlannerModalProps } from '../../models/transit/Planner';

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
                    <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wide mb-1.5">From</label>
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
                                    <span className="w-3.5 h-3.5 border-2 border-[#dadce0] border-t-[#1a73e8] rounded-full animate-spin inline-block" />
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
                    <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wide mb-1.5">To</label>
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
                    className={`w-full py-3.5 bg-[#1a73e8] text-white border-none rounded-xl text-[15px] font-semibold cursor-pointer transition-all duration-200 mb-4 ${(!origin || !destination || searching) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {searching ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
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
                                <p className="mt-2 text-[#5f6368] text-sm">
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
    const routeColors = ['#1a73e8', '#ea4335', '#34a853', '#fbbc04', '#9334e6'];
    const cardColor = routeColors[index % routeColors.length];

    return (
        <div
            className="bg-[#f8f9fa] rounded-xl p-3.5 mb-2.5 transition-shadow duration-200 border-l-4"
            style={{ borderLeftColor: cardColor }}
        >
            {/* Recommended tag for first result */}
            {index === 0 && (
                <div className="text-[11px] font-semibold text-[#34a853] bg-[#e6f4ea] px-2.5 py-0.5 rounded-lg inline-block mb-2">
                    ⭐ Recommended
                </div>
            )}

            {/* Card Header */}
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {option.segments.map((seg, i) => (
                        <span key={i} className="text-white px-2.5 py-0.5 rounded-xl text-xs font-semibold" style={{ backgroundColor: cardColor }}>
                            Route {seg.routeNum}
                        </span>
                    ))}
                    {option.transfers === 0 ? (
                        <span className="text-[#137333] bg-[#e6f4ea] px-2 py-0.5 rounded-[10px] text-[11px] font-medium">✅ Direct</span>
                    ) : (
                        <span className="text-[#e37400] bg-[#fef7e0] px-2 py-0.5 rounded-[10px] text-[11px] font-medium">🔄 {option.transfers} transfer</span>
                    )}
                </div>
                <span className="font-bold text-base text-[#202124]">
                    ~{option.totalTime} min
                </span>
            </div>

            {/* Step-by-step instructions with timeline */}
            <div className="text-[13px] text-[#202124] relative pl-7">
                {/* Vertical timeline line */}
                <div className="absolute left-[9px] top-2.5 bottom-2.5 w-0.5 bg-[#dadce0] rounded-sm" />

                {/* Step 1: Walk to first stop */}
                <div className="flex items-start gap-2.5 py-1.5 relative">
                    <span
                        className="w-3 h-3 rounded-full border-2 border-white shrink-0 mt-0.5 -ml-[22px] relative z-[1]"
                        style={{ backgroundColor: '#34a853', boxShadow: '0 0 0 1px #34a853' }}
                    />
                    <span>Walk to <strong>{option.originStop}</strong> ({option.walkingDistance}m)</span>
                </div>

                {/* Segments with board/ride/alight */}
                {option.segments.map((seg, i) => (
                    <div key={i}>
                        <div className="flex items-start gap-2.5 py-1.5 relative">
                            <span
                                className="w-3 h-3 rounded-full border-2 border-white shrink-0 mt-0.5 -ml-[22px] relative z-[1]"
                                style={{ backgroundColor: cardColor, boxShadow: `0 0 0 1px ${cardColor}` }}
                            />
                            <span>
                                Board <strong style={{ color: cardColor }}>Route {seg.routeNum}</strong>
                                <span className="text-[#5f6368]"> ({seg.routeName})</span>
                            </span>
                        </div>
                        <div className="flex items-start gap-2.5 py-1.5 relative pl-3 text-[#5f6368] text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#dadce0] shrink-0 mt-[5px] -ml-[17px] relative z-[1]" />
                            <span>{seg.fromStop} → {seg.toStop} · ~{seg.estimatedTime} min</span>
                        </div>
                        <div className="flex items-start gap-2.5 py-1.5 relative">
                            <span
                                className="w-3 h-3 rounded-full border-2 border-white shrink-0 mt-0.5 -ml-[22px] relative z-[1]"
                                style={{ backgroundColor: '#ea4335', boxShadow: '0 0 0 1px #ea4335' }}
                            />
                            <span>Get off at <strong>{seg.toStop}</strong></span>
                        </div>
                        {/* Transfer instruction */}
                        {i < option.segments.length - 1 && (
                            <div className="flex items-start gap-2.5 py-1.5 relative text-[#e37400] font-medium">
                                <span
                                    className="w-3 h-3 rounded-full border-2 border-white shrink-0 mt-0.5 -ml-[22px] relative z-[1]"
                                    style={{ backgroundColor: '#e37400', boxShadow: '0 0 0 1px #e37400' }}
                                />
                                <span>Transfer — wait for next bus at this stop</span>
                            </div>
                        )}
                    </div>
                ))}

                {/* Final step: walk to destination */}
                <div className="flex items-start gap-2.5 py-1.5 relative">
                    <span
                        className="w-3 h-3 rounded-full border-2 border-white shrink-0 mt-0.5 -ml-[22px] relative z-[1]"
                        style={{ backgroundColor: '#1a73e8', boxShadow: '0 0 0 1px #1a73e8' }}
                    />
                    <span>Walk to your destination</span>
                </div>
            </div>
        </div>
    );
}

