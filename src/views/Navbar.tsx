import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { Route } from '../models/Route';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
    onPlaceSelect?: (place: any) => void;
    onTripPlannerClick?: () => void;
    routes?: Route[];
    selectedRoute?: string | null;
    onRouteSelect?: (routeNum: string | null) => void;
}

// Function is for giving autocomplete suggestions for places
export default function Navbar({ onPlaceSelect, onTripPlannerClick, routes, selectedRoute, onRouteSelect }: NavbarProps) {
    const [showResults, setShowResults] = useState(false);
    const { isAdmin } = useAuth();

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
            const { lat, lng } = await getLatLng(results[0]); // await has no effect on this line 

            // Call the onPlaceSelect callback if provided
            if (onPlaceSelect) { // if onPlaceSelect is provided
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
        <nav style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '45px',
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            maxWidth: '100vw',
            overflow: 'visible'
        }}>
            {/* Logo/Title — links to landing page */}
            <Link to="/" style={{ textDecoration: 'none' }}>
                <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#1a73e8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>🚌</span>
                    <span>Go
                        <span role="img" aria-label="Bus Stop">🚏</span>ransit
                    </span>
                </div>
            </Link>

            {/* Center - Search with Autocomplete */}
            <div style={{
                flex: 1,
                maxWidth: '500px',
                margin: '0 40px',
                position: 'relative'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#f1f3f4',
                    borderRadius: '24px',
                    padding: '8px 16px',
                    gap: '8px'
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search for places..."
                        value={value}
                        onChange={handleInput} // calling handleInput on change
                        onFocus={() => data.length > 0 && setShowResults(true)}
                        disabled={!ready}
                        style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            outline: 'none',
                            fontSize: '14px',
                            width: '100%',
                            color: '#202124'
                        }}
                    />
                    {!ready && (
                        <div style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid #f1f3f4',
                            borderTop: '2px solid #1a73e8',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                    )}
                </div>

                {/* Autocomplete Results Dropdown */}
                {showResults && status === 'OK' && data.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '8px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        zIndex: 1002
                    }}>
                        {data.map((suggestion) => {  // combobox options for suggestions
                            const {
                                place_id,
                                structured_formatting: { main_text, secondary_text },
                            } = suggestion;

                            return (
                                <div
                                    key={place_id}
                                    onClick={() => handleSelect(suggestion.description, place_id)} // call handleSelect with the selected place for updating the place state
                                    style={{
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #f1f3f4',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                >
                                    <div style={{ fontWeight: '500', color: '#202124', fontSize: '14px' }}> {/*Main address*/}
                                        {main_text}
                                    </div>
                                    {secondary_text && (
                                        <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px' }}> {/* other detials like street name */}
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
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                {/* Route Selector Dropdown */}
                {routes && onRouteSelect && (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5f6368"
                            strokeWidth="2" style={{ position: 'absolute', left: '10px', pointerEvents: 'none', zIndex: 1 }}>
                            <rect x="3" y="6" width="18" height="12" rx="2" />
                            <circle cx="7" cy="18" r="2" />
                            <circle cx="17" cy="18" r="2" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <select
                            value={selectedRoute || ''}
                            onChange={(e) => onRouteSelect(e.target.value || null)}
                            style={{
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                padding: '8px 32px 8px 34px',
                                backgroundColor: selectedRoute ? '#e8f0fe' : '#f1f3f4',
                                border: selectedRoute ? '2px solid #1a73e8' : '1px solid #dadce0',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: selectedRoute ? '#1a73e8' : '#5f6368',
                                cursor: 'pointer',
                                outline: 'none',
                                minWidth: '180px',
                                transition: 'all 0.2s',
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235f6368' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 10px center',
                            }}
                        >
                            <option value="">🚌 Select Route</option>
                            {[...routes]
                                .sort((a, b) => parseInt(a.ROUTE_NUM) - parseInt(b.ROUTE_NUM))
                                .map(route => (
                                    <option key={route.ROUTE_ID} value={route.ROUTE_NUM}>
                                        Route {route.ROUTE_NUM} — {route.ROUTE_NAME}
                                    </option>
                                ))
                            }
                        </select>
                    </div>
                )}

                {/* Trip Planner Button */}
                <button
                    onClick={onTripPlannerClick}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        backgroundColor: '#1a73e8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1557b0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a73e8'}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                    </svg>
                    Future Trip Planner
                </button>
                {/* Admin link — only visible to users with role = 'admin' */}
                {isAdmin && (
                    <Link to="/admin" style={{ textDecoration: 'none' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            backgroundColor: '#003DA5',
                            color: 'white',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                        }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" />
                                <rect x="14" y="14" width="7" height="7" rx="1" />
                            </svg>
                            Admin
                        </div>
                    </Link>
                )}
                {/* Profile Icon — links to /profile */}
                <Link to="/profile" style={{ textDecoration: 'none' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#1a73e8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: '500'
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                </Link>
            </div>

            {/* CSS for loading spinner animation */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </nav>
    );
}
