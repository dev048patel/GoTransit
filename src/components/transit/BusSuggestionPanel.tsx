/**
 * BusSuggestionPanel
 * Floating side panel triggered when user clicks "Yes" on the search marker popup.
 * - Detects GPS origin automatically
 * - Calls RoutePlanningService with GPS origin → searched destination
 * - Displays route suggestions using timeline route cards
 */
import { useState, useEffect, useCallback } from 'react';
import { RoutePlanningService } from '../../services/RoutePlanningService';
import { TripOption } from '../../models/transit/Planner';

import { BusSuggestionPanelProps } from '../../models/transit/BusSuggestionPanel';

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
        <div className="absolute top-[55px] right-2.5 w-[380px] max-h-[calc(100vh-70px)] bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] z-[1500] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-[18px] py-3.5 border-b border-[#e8eaed] bg-[#f8f9fa]">
                <div>
                    <div className="font-bold text-base text-[#202124]">
                        🚌 Bus Suggestions
                    </div>
                    <div className="text-xs text-[#5f6368] mt-0.5">
                        To: {destination.name}
                    </div>
                </div>
                <button onClick={onClose} className="bg-transparent border-none text-lg cursor-pointer text-[#5f6368] px-2 py-1 rounded-full">✕</button>
            </div>

            {/* Content */}
            <div className="p-3.5 overflow-y-auto flex-1">
                {gpsLoading && (
                    <div className="flex items-center gap-2.5 p-4 text-sm text-[#5f6368]">
                        <div className="w-3.5 h-3.5 border-2 border-[#dadce0] border-t-[#1a73e8] rounded-full animate-spin inline-block" />
                        <span>Detecting your location...</span>
                    </div>
                )}

                {gpsError && (
                    <div className="text-[#ea4335] text-[13px] px-2.5 py-1.5 bg-[#fce8e6] rounded-lg">{gpsError}</div>
                )}

                {searching && !gpsLoading && (
                    <div className="flex items-center gap-2.5 p-4 text-sm text-[#5f6368]">
                        <div className="w-3.5 h-3.5 border-2 border-[#dadce0] border-t-[#1a73e8] rounded-full animate-spin inline-block" />
                        <span>Finding routes...</span>
                    </div>
                )}

                {!searching && !gpsLoading && !gpsError && results.length === 0 && (
                    <div className="text-center px-4 py-6">
                        <div className="text-[28px] mb-2">🤷</div>
                        <div className="font-medium text-[#5f6368]">No routes found</div>
                        <div className="text-xs text-[#80868b] mt-1">
                            No transit routes connect your location to this destination
                        </div>
                    </div>
                )}

                {results.map((option, i) => (
                    <div key={i} onClick={() => onSelectRoute?.(option)} className="cursor-pointer">
                        <RouteCard option={option} index={i} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- RouteCard (same timeline design as TripPlannerModal) ---
function RouteCard({ option, index }: { option: TripOption; index: number }) {
    const routeColors = ['#1a73e8', '#ea4335', '#34a853', '#fbbc04', '#9334e6'];
    const cardColor = routeColors[index % routeColors.length];

    return (
        <div
            className="bg-[#f8f9fa] rounded-xl p-3.5 mb-2.5 transition-shadow duration-200 border-l-4"
            style={{ borderLeftColor: cardColor }}
        >
            {index === 0 && (
                <div className="text-[11px] font-semibold text-[#34a853] bg-[#e6f4ea] px-2.5 py-0.5 rounded-lg inline-block mb-2">
                    ⭐ Recommended
                </div>
            )}

            {/* Header */}
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

            {/* Timeline */}
            <div className="text-[13px] text-[#202124] relative pl-7">
                <div className="absolute left-[9px] top-2.5 bottom-2.5 w-0.5 bg-[#dadce0] rounded-sm" />

                <div className="flex items-start gap-2.5 py-1.5 relative">
                    <span
                        className="w-3 h-3 rounded-full border-2 border-white shrink-0 mt-0.5 -ml-[22px] relative z-[1]"
                        style={{ backgroundColor: '#34a853', boxShadow: '0 0 0 1px #34a853' }}
                    />
                    <span>Walk to <strong>{option.originStop}</strong> ({option.walkingDistance}m)</span>
                </div>

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
