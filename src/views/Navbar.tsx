/* Navbar — top navigation bar with search autocomplete, route selector, admin link, and profile icon */
import React from 'react';
import { Link } from 'react-router-dom';
import { Route } from '../models/transit/Route';
import { useAuth } from '../models/context/AuthContext';
import { useNavbarController } from '../controllers/useNavbarController';
import logo from '../New-Image.jpeg';

interface NavbarProps {
    onPlaceSelect?: (place: any) => void;
    routes?: Route[];
    selectedRoute?: string | null;
    onRouteSelect?: (routeNum: string | null) => void;
}

// Renders the top navbar with search, route filter, admin link, and profile
export default function Navbar({ onPlaceSelect, routes, selectedRoute, onRouteSelect }: NavbarProps) {
    const { isAdmin } = useAuth();
    // All search logic lives in the controller
    const { ready, value, status, data, showResults, handleInput, handleSelect, handleFocus } = useNavbarController(onPlaceSelect);
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    return (
        <nav className="navbar-root">
            {/* Top row — always visible */}
            <div className="navbar-top-row">
                {/* Logo — links to landing page */}
                <Link to="/" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
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

                {/* Search bar */}
                <div className="navbar-search" style={{ flex: 1, maxWidth: '500px', position: 'relative' }}>
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
                            onFocus={handleFocus}
                            disabled={!ready}
                            style={{
                                border: 'none',
                                backgroundColor: 'transparent',
                                outline: 'none',
                                fontSize: '16px',
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

                {/* Desktop actions — hidden on mobile */}
                <div className="navbar-desktop-actions">
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
                            {selectedRoute ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRouteSelect(null); }}
                                    style={{
                                        position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                                        width: '20px', height: '20px', borderRadius: '50%', border: 'none',
                                        backgroundColor: '#1a73e8', color: 'white', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '12px', fontWeight: '700', lineHeight: 1, padding: 0,
                                        transition: 'background-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d32f2f'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a73e8'}
                                    title="Clear route selection"
                                >
                                    ✕
                                </button>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            )}
                        </div>
                    )}

                    {/* Admin link */}
                    {isAdmin && (
                        <Link to="/admin" style={{ textDecoration: 'none' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '7px 12px', backgroundColor: '#003DA5', color: 'white',
                                borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                                cursor: 'pointer', transition: 'background-color 0.2s', whiteSpace: 'nowrap',
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                                    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                                    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                                </svg>
                                <span>Admin</span>
                            </div>
                        </Link>
                    )}

                    {/* Profile Icon */}
                    <Link to="/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                        <div style={{
                            width: '34px', height: '34px', borderRadius: '50%',
                            backgroundColor: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'white', transition: 'box-shadow 0.2s',
                            boxShadow: '0 2px 6px rgba(26,115,232,0.3)',
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                    </Link>
                </div>

                {/* Mobile hamburger + profile — visible only on mobile */}
                <div className="navbar-mobile-actions">
                    <Link to="/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            backgroundColor: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white',
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                    </Link>
                    <button
                        className="navbar-hamburger"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        ) : (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
                <div className="navbar-mobile-menu">
                    {/* Route Selector — full width on mobile */}
                    {routes && onRouteSelect && (
                        <div style={{ position: 'relative' }}>
                            <select
                                value={selectedRoute || ''}
                                onChange={(e) => { onRouteSelect(e.target.value || null); setMobileMenuOpen(false); }}
                                style={{
                                    appearance: 'none', WebkitAppearance: 'none', width: '100%',
                                    padding: '10px 34px 10px 14px',
                                    backgroundColor: selectedRoute ? '#e8f0fe' : '#f1f3f4',
                                    border: selectedRoute ? '2px solid #1a73e8' : '1px solid #dadce0',
                                    borderRadius: '12px', fontSize: '14px', fontWeight: '500',
                                    color: selectedRoute ? '#1a73e8' : '#5f6368', cursor: 'pointer', outline: 'none',
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
                            {selectedRoute && (
                                <button
                                    onClick={() => onRouteSelect(null)}
                                    style={{
                                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                        width: '22px', height: '22px', borderRadius: '50%', border: 'none',
                                        backgroundColor: '#1a73e8', color: 'white', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '12px', fontWeight: '700', padding: 0,
                                    }}
                                >✕</button>
                            )}
                            {!selectedRoute && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            )}
                        </div>
                    )}

                    {/* Admin link */}
                    {isAdmin && (
                        <Link to="/admin" style={{ textDecoration: 'none' }} onClick={() => setMobileMenuOpen(false)}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 14px', backgroundColor: '#003DA5', color: 'white',
                                borderRadius: '12px', fontSize: '14px', fontWeight: '600',
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                                    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                                </svg>
                                Admin Dashboard
                            </div>
                        </Link>
                    )}
                </div>
            )}

            {/* Responsive CSS */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .navbar-root {
                    position: fixed;
                    top: 0; left: 0; right: 0;
                    background-color: white;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    z-index: 1001;
                    max-width: 100vw;
                }

                .navbar-top-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 16px;
                    height: 52px;
                    gap: 8px;
                }

                .navbar-desktop-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-shrink: 0;
                }

                .navbar-mobile-actions {
                    display: none;
                    align-items: center;
                    gap: 6px;
                    flex-shrink: 0;
                }

                .navbar-hamburger {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px; height: 36px;
                    border: none;
                    background: #f1f3f4;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .navbar-hamburger:active { background: #e0e0e0; }

                .navbar-mobile-menu {
                    display: none;
                    flex-direction: column;
                    gap: 8px;
                    padding: 8px 16px 14px;
                    border-top: 1px solid #f1f3f4;
                    background: white;
                    animation: slideDown 0.2s ease-out;
                }

                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* ── Mobile: <= 640px ── */
                @media (max-width: 640px) {
                    .navbar-desktop-actions { display: none; }
                    .navbar-mobile-actions { display: flex; }
                    .navbar-mobile-menu { display: flex; }
                    .navbar-search { margin: 0 6px !important; }
                    .navbar-top-row { height: 48px; padding: 0 10px; }
                }
            `}</style>
        </nav>
    );
}
