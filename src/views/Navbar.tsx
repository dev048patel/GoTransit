import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { Route } from '../models/Route';
import { useAuth } from '../context/AuthContext';
import logo from '../New-Image.jpeg';

interface NavbarProps {
    onPlaceSelect?: (place: any) => void;
    routes?: Route[];
    selectedRoute?: string | null;
    onRouteSelect?: (routeNum: string | null) => void;
}

// Function is for giving autocomplete suggestions for places
export default function Navbar({ onPlaceSelect, routes, selectedRoute, onRouteSelect }: NavbarProps) {
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
            const { lat, lng } = await getLatLng(results[0]);

            // Call the onPlaceSelect callback if provided
            if (onPlaceSelect) {
                onPlaceSelect({
                    id: placeId,
                    displayName: description,
                    location: { lat, lng },
                });
            }

            // Track "places" event for admin dashboard analytics
            const baseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
            fetch(`${baseUrl}/api/features/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'places' }),
            }).catch(() => { }); // Silent fail — analytics should never break the app
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
            height: '52px',
            backgroundColor: 'white',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            maxWidth: '100vw',
            overflow: 'visible',
            gap: '8px',
        }}>
            {/* Logo — app logo image, links to landing page */}
            <Link to="/" style={{
                textDecoration: 'none',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
            }}>
                <img
                    src={logo}
                    alt="GoTransit Regina"
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        objectFit: 'cover',
                        boxShadow: '0 2px 8px rgba(0,61,165,0.15)',
                    }}
                />
            </Link>

            {/* Center - Search with Autocomplete */}
            <div className="navbar-search" style={{
                flex: 1,
                maxWidth: '500px',
                position: 'relative',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#f1f3f4',
                    borderRadius: '24px',
                    padding: '7px 14px',
                    gap: '8px',
                }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2" style={{ flexShrink: 0 }}>
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
                        style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            outline: 'none',
                            fontSize: '14px',
                            width: '100%',
                            color: '#202124',
                        }}
                    />
                    {!ready && (
                        <div style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid #f1f3f4',
                            borderTop: '2px solid #1a73e8',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            flexShrink: 0,
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
                        borderRadius: '12px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        zIndex: 1002,
                    }}>
                        {data.map((suggestion) => {
                            const {
                                place_id,
                                structured_formatting: { main_text, secondary_text },
                            } = suggestion;

                            return (
                                <div
                                    key={place_id}
                                    onClick={() => handleSelect(suggestion.description, place_id)}
                                    style={{
                                        padding: '10px 14px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #f1f3f4',
                                        transition: 'background-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                >
                                    <div style={{ fontWeight: '500', color: '#202124', fontSize: '14px' }}>
                                        {main_text}
                                    </div>
                                    {secondary_text && (
                                        <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '3px' }}>
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
                gap: '8px',
                flexShrink: 0,
            }}>
                {/* Route Selector Dropdown */}
                {routes && onRouteSelect && (
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                        <select
                            className="navbar-route-select"
                            value={selectedRoute || ''}
                            onChange={(e) => onRouteSelect(e.target.value || null)}
                            style={{
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                padding: '7px 34px 7px 12px',
                                backgroundColor: selectedRoute ? '#e8f0fe' : '#f1f3f4',
                                border: selectedRoute ? '2px solid #1a73e8' : '1px solid #dadce0',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: selectedRoute ? '#1a73e8' : '#5f6368',
                                cursor: 'pointer',
                                outline: 'none',
                                minWidth: '160px',
                                transition: 'all 0.2s',
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
                        {/* Dropdown arrow OR clear button */}
                        {selectedRoute ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRouteSelect(null);
                                }}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    backgroundColor: '#1a73e8',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    lineHeight: 1,
                                    padding: 0,
                                    transition: 'background-color 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d32f2f'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a73e8'}
                                title="Clear route selection"
                            >
                                ✕
                            </button>
                        ) : (
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#5f6368"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    pointerEvents: 'none',
                                }}
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        )}
                    </div>
                )}

                {/* Admin link — only visible to users with role = 'admin' */}
                {isAdmin && (
                    <Link to="/admin" style={{ textDecoration: 'none' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '7px 12px',
                            backgroundColor: '#003DA5',
                            color: 'white',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            whiteSpace: 'nowrap',
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" />
                                <rect x="14" y="14" width="7" height="7" rx="1" />
                            </svg>
                            <span className="navbar-admin-label">Admin</span>
                        </div>
                    </Link>
                )}
                {/* Profile Icon — links to /profile */}
                <Link to="/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                    <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        backgroundColor: '#1a73e8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white',
                        transition: 'box-shadow 0.2s',
                        boxShadow: '0 2px 6px rgba(26,115,232,0.3)',
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                </Link>
            </div>

            {/* Responsive + spinner CSS */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                /* ── Mobile breakpoint (≤768px) ─────────────────── */
                @media (max-width: 768px) {
                    .navbar-search {
                        margin: 0 4px !important;
                    }
                    .navbar-route-select {
                        min-width: 110px !important;
                        font-size: 12px !important;
                        padding: 6px 8px !important;
                    }
                    .navbar-admin-label {
                        display: none;
                    }
                }

                /* ── Very small screens (≤480px) ────────────────── */
                @media (max-width: 480px) {
                    .navbar-route-select {
                        min-width: 90px !important;
                    }
                }
            `}</style>
        </nav>
    );
}