import React, { useState, useEffect, useRef } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { NavbarProps } from '../models/views/NavbarProps';

export default function Navbar({ onPlaceSelect, onTripPlannerClick, routes, selectedRoute, onRouteSelect }: NavbarProps) {
    const [showResults, setShowResults] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const menuRef = useRef<HTMLDivElement>(null);

    // Detect mobile viewport
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    // Use Google Places Autocomplete hook
    const {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            location: new google.maps.LatLng(50.4452, -104.6189),
            radius: 50 * 1000,
        },
        debounce: 300,
    });

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        setShowResults(true);
    };

    const handleSelect = async (description: string, placeId: string) => {
        setValue(description, false);
        clearSuggestions();
        setShowResults(false);
        setMenuOpen(false);

        try {
            const results = await getGeocode({ address: description });
            const { lat, lng } = await getLatLng(results[0]);

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

    // --- Search bar component (shared between mobile and desktop) ---
    // Render function (NOT a component) so React preserves the input DOM node across re-renders
    const renderSearchBar = (mobile = false) => (
        <div style={{
            flex: mobile ? undefined : 1,
            maxWidth: mobile ? '100%' : '500px',
            margin: mobile ? '0' : '0 40px',
            position: 'relative',
            width: mobile ? '100%' : undefined,
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
                    onChange={handleInput}
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
                        width: '16px', height: '16px',
                        border: '2px solid #f1f3f4', borderTop: '2px solid #1a73e8',
                        borderRadius: '50%', animation: 'spin 1s linear infinite'
                    }} />
                )}
            </div>

            {/* Autocomplete Results Dropdown */}
            {showResults && status === 'OK' && data.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%', left: 0, right: 0,
                    marginTop: '8px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 1003
                }}>
                    {data.map((suggestion) => {
                        const { place_id, structured_formatting: { main_text, secondary_text } } = suggestion;
                        return (
                            <div
                                key={place_id}
                                onClick={() => handleSelect(suggestion.description, place_id)}
                                style={{
                                    padding: '12px 16px', cursor: 'pointer',
                                    borderBottom: '1px solid #f1f3f4',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            >
                                <div style={{ fontWeight: '500', color: '#202124', fontSize: '14px' }}>
                                    {main_text}
                                </div>
                                {secondary_text && (
                                    <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px' }}>
                                        {secondary_text}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    return (
        <nav style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '50px',
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            maxWidth: '100vw',
            overflow: 'visible'
        }}>
            {/* Logo */}
            <div style={{
                fontSize: isMobile ? '16px' : '20px',
                fontWeight: 'bold',
                color: '#1a73e8',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0
            }}>
                <span>🚌</span>
                <span>Go
                    <span role="img" aria-label="Bus Stop">🚏</span>ransit
                </span>
            </div>

            {/* Desktop: Search bar inline */}
            {!isMobile && renderSearchBar()}

            {/* Desktop: Right-side actions */}
            {!isMobile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
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
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#1a73e8', color: 'white',
                            border: 'none', borderRadius: '20px',
                            fontSize: '14px', fontWeight: '500',
                            cursor: 'pointer', transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1557b0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a73e8'}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                        </svg>
                        Future Trip Planner
                    </button>

                    {/* Profile Icon */}
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        backgroundColor: '#1a73e8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'white',
                        fontSize: '16px', fontWeight: '500'
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                </div>
            )}

            {/* Mobile: Hamburger button */}
            {isMobile && (
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '8px', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background-color 0.2s',
                        backgroundColor: menuOpen ? '#e8f0fe' : 'transparent'
                    }}
                    aria-label="Menu"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2" strokeLinecap="round">
                        {menuOpen ? (
                            <>
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </>
                        ) : (
                            <>
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                            </>
                        )}
                    </svg>
                </button>
            )}

            {/* Mobile slide-down menu */}
            {isMobile && menuOpen && (
                <div
                    ref={menuRef}
                    style={{
                        position: 'absolute',
                        top: '50px', left: 0, right: 0,
                        backgroundColor: 'white',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                        zIndex: 1002,
                        padding: '12px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        animation: 'slideDown 0.25s ease-out'
                    }}
                >
                    {/* Search */}
                    {renderSearchBar(true)}

                    {/* Route selector */}
                    {routes && onRouteSelect && (
                        <select
                            value={selectedRoute || ''}
                            onChange={(e) => {
                                onRouteSelect(e.target.value || null);
                                setMenuOpen(false);
                            }}
                            style={{
                                padding: '10px 14px',
                                backgroundColor: selectedRoute ? '#e8f0fe' : '#f1f3f4',
                                border: selectedRoute ? '2px solid #1a73e8' : '1px solid #dadce0',
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: selectedRoute ? '#1a73e8' : '#5f6368',
                                cursor: 'pointer',
                                outline: 'none',
                                width: '100%',
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
                    )}

                    {/* Trip Planner */}
                    <button
                        onClick={() => {
                            onTripPlannerClick?.();
                            setMenuOpen(false);
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '8px', padding: '10px 16px',
                            backgroundColor: '#1a73e8', color: 'white',
                            border: 'none', borderRadius: '12px',
                            fontSize: '14px', fontWeight: '500',
                            cursor: 'pointer', width: '100%'
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                        </svg>
                        Future Trip Planner
                    </button>
                </div>
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </nav>
    );
}
