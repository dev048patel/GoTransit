import React, { useState } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { Route } from '../models/transit/Route';

interface NavbarProps {
    onPlaceSelect?: (place: any) => void;
    onTripPlannerClick?: () => void;
    routes?: Route[];
    selectedRoute?: string | null;
    onRouteSelect?: (routeNum: string | null) => void;
}

// Function is for giving autocomplete suggestions for places
export default function Navbar({ onPlaceSelect, onTripPlannerClick }: NavbarProps = {}) {
    const [showResults, setShowResults] = useState(false);

    // Use Google Places Autocomplete hook
    const {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            location: new google.maps.LatLng(50.4452, -104.6189), // Regina, Saskatchewan
            radius: 50 * 1000, // 50km radius
        },
        debounce: 300, // 300ms debounce built-in
    });

    // Function is for handling input changes
    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        setShowResults(true);
    };

    // function is for handling place selection
    const handleSelect = async (description: string, placeId: string) => {
        setValue(description, false);
        clearSuggestions();
        setShowResults(false);

        try {
            // Get place details
            const results = await getGeocode({ address: description });
            const { lat, lng } = await getLatLng(results[0]);

            // Call the onPlaceSelect callback if provided
            if (onPlaceSelect) {
                onPlaceSelect({
                    id: placeId,
                    displayName: description,
                    location: { lat, lng },
                });
            }
        } catch (error) {
            console.error('Error selecting place:', error);
        }
    };

    return (
        <nav className="absolute top-0 left-0 right-0 h-[45px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] z-[1001] flex items-center justify-between px-5 max-w-[100vw] overflow-visible">
            {/* Logo/Title */}
            <div className="text-xl font-bold text-[#1a73e8] flex items-center gap-2">
                <span>🚌</span>
                <span>Go
                    <span role="img" aria-label="Bus Stop">🚏</span>ransit
                </span>
            </div>

            {/* Center - Search with Autocomplete */}
            <div className="flex-1 max-w-[500px] mx-10 relative">
                <div className="flex items-center bg-[#f1f3f4] rounded-3xl px-4 py-2 gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search for places..."
                        value={value}
                        onChange={handleInput}
                        onFocus={() => data.length > 0 && setShowResults(true)}
                        disabled={!ready}
                        className="border-none bg-transparent outline-none text-sm w-full text-[#202124]"
                    />
                    {!ready && (
                        <div className="w-4 h-4 border-2 border-[#f1f3f4] border-t-[#1a73e8] rounded-full animate-spin" />
                    )}
                </div>

                {/* Autocomplete Results Dropdown */}
                {showResults && status === 'OK' && data.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] max-h-[300px] overflow-y-auto z-[1002]">
                        {data.map((suggestion) => {
                            const {
                                place_id,
                                structured_formatting: { main_text, secondary_text },
                            } = suggestion;

                            return (
                                <div
                                    key={place_id}
                                    onClick={() => handleSelect(suggestion.description, place_id)}
                                    className="px-4 py-3 cursor-pointer border-b border-[#f1f3f4] transition-colors duration-200 hover:bg-[#f8f9fa]"
                                >
                                    <div className="font-medium text-[#202124] text-sm">
                                        {main_text}
                                    </div>
                                    {secondary_text && (
                                        <div className="text-xs text-[#5f6368] mt-1">
                                            {secondary_text}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-4">
                {/* Trip Planner Button */}
                <button
                    onClick={onTripPlannerClick}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white border-none rounded-[20px] text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-[#1557b0]"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                    </svg>
                    Future Trip Planner
                </button>
                {/* Admin link hidden from public users — access via /admin URL directly */}
                {/* Profile Icon */}
                <div className="w-9 h-9 rounded-full bg-[#1a73e8] flex items-center justify-center cursor-pointer text-white text-base font-medium">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
            </div>
        </nav>
    );
}