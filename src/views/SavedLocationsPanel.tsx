import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SavedDestination } from '../models/transit/SavedDestination';
import type { useSavedDestinationsController } from '../controllers/useSavedDestinationsController';

type Ctrl = ReturnType<typeof useSavedDestinationsController>;

interface SavedLocationsPanelProps {
    ctrl: Ctrl;
    onGoNow?: (place: { id: string; displayName: string; location: { lat: number; lng: number } }) => void;
}

/* ── Bookmark icon (outline / filled) ────────────────────────── */
const BookmarkIcon = ({ filled }: { filled?: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? '#2E7D32' : 'none'} stroke={filled ? '#2E7D32' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
);

const LocationPinIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

/* ── Single destination list item ─────────────────────────────── */
function DestinationItem({
    dest,
    onGoNow,
    onDeleteRequest,
}: {
    dest: SavedDestination;
    onGoNow: (dest: SavedDestination) => void;
    onDeleteRequest: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            style={{
                borderRadius: '10px',
                border: expanded ? '1.5px solid #2E7D32' : '1.5px solid #e8e8e8',
                backgroundColor: expanded ? '#F1F8F2' : 'white',
                marginBottom: '8px',
                overflow: 'hidden',
                transition: 'border-color 0.15s, background-color 0.15s',
                cursor: 'pointer',
            }}
            onClick={() => setExpanded(e => !e)}
        >
            {/* Main row */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '11px 13px', gap: '10px' }}>
                <div style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    backgroundColor: expanded ? '#E8F5E9' : '#f5f5f5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'background-color 0.15s',
                    color: expanded ? '#2E7D32' : '#888',
                }}>
                    <BookmarkIcon filled={expanded} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#202124', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {dest.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {dest.address}
                    </div>
                </div>
                <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" strokeLinecap="round"
                    style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </div>

            {/* Action buttons — shown when expanded */}
            {expanded && (
                <div
                    style={{ display: 'flex', gap: '8px', padding: '0 13px 12px', borderTop: '1px solid #e8f5e9' }}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={() => onGoNow(dest)}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            backgroundColor: '#2E7D32', color: 'white',
                            fontSize: '13px', fontWeight: '600', transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1B5E20'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2E7D32'}
                    >
                        <LocationPinIcon />
                        Go Now!
                    </button>
                    <button
                        onClick={() => onDeleteRequest(dest.id)}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #ffcdd2', cursor: 'pointer',
                            backgroundColor: '#fff5f5', color: '#c62828',
                            fontSize: '13px', fontWeight: '600', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ffebee'; e.currentTarget.style.borderColor = '#ef9a9a'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff5f5'; e.currentTarget.style.borderColor = '#ffcdd2'; }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                        </svg>
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── Delete Confirmation Modal ────────────────────────────────── */
function DeleteConfirmModal({
    name,
    loading,
    onConfirm,
    onCancel,
}: {
    name: string;
    loading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div style={{
            position: 'absolute', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: '20px',
        }}>
            <div style={{
                backgroundColor: 'white', borderRadius: '14px',
                padding: '24px 20px', width: '100%', maxWidth: '280px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)', textAlign: 'center',
            }}>
                <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    backgroundColor: '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 14px',
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c62828" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                    </svg>
                </div>
                <div style={{ fontWeight: '700', fontSize: '15px', color: '#202124', marginBottom: '6px' }}>
                    Delete "{name}"?
                </div>
                <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '20px', lineHeight: '1.5' }}>
                    This location will be permanently removed from your saved places.
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        style={{
                            flex: 1, padding: '9px', borderRadius: '8px',
                            border: '1.5px solid #e0e0e0', backgroundColor: 'white',
                            fontSize: '13px', fontWeight: '600', color: '#5f6368', cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        style={{
                            flex: 1, padding: '9px', borderRadius: '8px',
                            border: 'none', backgroundColor: loading ? '#ef9a9a' : '#D32F2F',
                            fontSize: '13px', fontWeight: '600', color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.15s',
                        }}
                    >
                        {loading ? 'Deleting…' : 'Yes, Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Main Panel — pure view, receives controller as prop ─────── */
export default function SavedLocationsPanel({ ctrl, onGoNow }: SavedLocationsPanelProps) {
    const handleGoNow = (dest: SavedDestination) => {
        if (onGoNow) {
            onGoNow({ id: dest.place_id || dest.id, displayName: dest.name, location: { lat: dest.lat, lng: dest.lng } });
        }
        ctrl.handleClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={ctrl.handleClose}
                style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.2)',
                    zIndex: 1099, top: '52px',
                }}
            />

            {/* Panel */}
            <div style={{
                position: 'fixed', top: '52px', right: 0,
                width: 'min(340px, 100vw)',
                height: 'calc(100vh - 52px)',
                backgroundColor: 'white',
                boxShadow: '-4px 0 20px rgba(0,0,0,0.12)',
                zIndex: 1100,
                display: 'flex', flexDirection: 'column',
                borderRadius: '16px 0 0 0',
                overflow: 'hidden',
            }}>

                {/* Delete confirmation overlay */}
                {ctrl.deletingId && ctrl.deletingDestination && (
                    <DeleteConfirmModal
                        name={ctrl.deletingDestination.name}
                        loading={ctrl.deleteLoading}
                        onConfirm={ctrl.handleDeleteConfirm}
                        onCancel={ctrl.handleDeleteCancel}
                    />
                )}

                {/* ── Header ── */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 16px 12px',
                    borderBottom: '1px solid #f0f0f0',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {ctrl.mode === 'add' && (
                            <button
                                onClick={ctrl.switchToList}
                                style={{
                                    width: '28px', height: '28px', borderRadius: '8px', border: 'none',
                                    backgroundColor: '#f1f3f4', cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', color: '#5f6368',
                                    flexShrink: 0,
                                }}
                                title="Back to list"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                                width: '28px', height: '28px', borderRadius: '8px',
                                backgroundColor: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <BookmarkIcon filled />
                            </div>
                            <span style={{ fontWeight: '700', fontSize: '15px', color: '#202124' }}>
                                {ctrl.mode === 'add' ? 'Add Location' : 'Saved Locations'}
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {ctrl.mode === 'list' && ctrl.isAuthenticated && (
                            <button
                                onClick={ctrl.switchToAdd}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    padding: '5px 10px', borderRadius: '8px', border: 'none',
                                    backgroundColor: '#E8F5E9', color: '#2E7D32',
                                    fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                                    transition: 'background-color 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#C8E6C9'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#E8F5E9'}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Add
                            </button>
                        )}
                        <button
                            onClick={ctrl.handleClose}
                            style={{
                                width: '28px', height: '28px', borderRadius: '8px', border: 'none',
                                backgroundColor: '#f1f3f4', cursor: 'pointer', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', color: '#5f6368',
                                transition: 'background-color 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e0e0e0'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f3f4'}
                            title="Close"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ── Body ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>

                    {/* Not authenticated */}
                    {!ctrl.isAuthenticated && (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <div style={{
                                width: '52px', height: '52px', borderRadius: '50%',
                                backgroundColor: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 14px',
                            }}>
                                <BookmarkIcon filled />
                            </div>
                            <div style={{ fontWeight: '700', fontSize: '15px', color: '#202124', marginBottom: '8px' }}>
                                Save your favourite spots
                            </div>
                            <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '20px', lineHeight: '1.5' }}>
                                Sign in to save locations and get to them faster.
                            </div>
                            <Link to="/login" onClick={ctrl.handleClose}>
                                <button style={{
                                    padding: '9px 24px', borderRadius: '10px', border: 'none',
                                    backgroundColor: '#2E7D32', color: 'white',
                                    fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                                }}>
                                    Sign In
                                </button>
                            </Link>
                        </div>
                    )}

                    {/* List mode */}
                    {ctrl.isAuthenticated && ctrl.mode === 'list' && (
                        <>
                            {ctrl.loading && (
                                <div style={{ textAlign: 'center', padding: '30px', color: '#5f6368' }}>
                                    <div style={{
                                        width: '22px', height: '22px', borderRadius: '50%',
                                        border: '2.5px solid #e0e0e0', borderTop: '2.5px solid #2E7D32',
                                        animation: 'spin 0.8s linear infinite', margin: '0 auto 10px',
                                    }} />
                                    <span style={{ fontSize: '13px' }}>Loading…</span>
                                </div>
                            )}

                            {!ctrl.loading && ctrl.error && (
                                <div style={{ textAlign: 'center', padding: '20px', fontSize: '13px', color: '#c62828' }}>
                                    {ctrl.error}
                                </div>
                            )}

                            {!ctrl.loading && !ctrl.error && ctrl.destinations.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                                    <div style={{
                                        width: '52px', height: '52px', borderRadius: '50%',
                                        backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 14px', color: '#bdbdbd',
                                    }}>
                                        <BookmarkIcon />
                                    </div>
                                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#5f6368', marginBottom: '6px' }}>
                                        No saved locations yet
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#9e9e9e', marginBottom: '18px' }}>
                                        Tap "+ Add" to save your first spot.
                                    </div>
                                    <button
                                        onClick={ctrl.switchToAdd}
                                        style={{
                                            padding: '8px 20px', borderRadius: '10px', border: 'none',
                                            backgroundColor: '#2E7D32', color: 'white',
                                            fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                                        }}
                                    >
                                        + Add Location
                                    </button>
                                </div>
                            )}

                            {!ctrl.loading && !ctrl.error && ctrl.destinations.map(dest => (
                                <DestinationItem
                                    key={dest.id}
                                    dest={dest}
                                    onGoNow={handleGoNow}
                                    onDeleteRequest={ctrl.handleDeleteRequest}
                                />
                            ))}
                        </>
                    )}

                    {/* Add mode */}
                    {ctrl.isAuthenticated && ctrl.mode === 'add' && (
                        <div>
                            {/* Search input */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#5f6368', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Search for a place
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        backgroundColor: '#f1f3f4', borderRadius: '10px', padding: '9px 12px',
                                        border: ctrl.showSearchResults ? '1.5px solid #2E7D32' : '1.5px solid transparent',
                                        transition: 'border-color 0.15s',
                                    }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2">
                                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                        </svg>
                                        <input
                                            type="text"
                                            placeholder="e.g. University of Regina…"
                                            value={ctrl.searchValue}
                                            onChange={ctrl.handleSearchInput}
                                            onFocus={() => ctrl.searchData.length > 0 && ctrl.setShowSearchResults(true)}
                                            disabled={!ctrl.ready}
                                            autoFocus
                                            style={{
                                                border: 'none', backgroundColor: 'transparent', outline: 'none',
                                                fontSize: '14px', color: '#202124', width: '100%',
                                            }}
                                        />
                                        {ctrl.searchValue && (
                                            <button
                                                onClick={ctrl.handleReset}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#9e9e9e', display: 'flex', alignItems: 'center' }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>

                                    {/* Autocomplete dropdown */}
                                    {ctrl.showSearchResults && ctrl.searchStatus === 'OK' && ctrl.searchData.length > 0 && (
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0,
                                            marginTop: '4px', backgroundColor: 'white', borderRadius: '10px',
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.14)', zIndex: 10,
                                            maxHeight: '200px', overflowY: 'auto',
                                        }}>
                                            {ctrl.searchData.map(suggestion => {
                                                const { place_id, structured_formatting: { main_text, secondary_text } } = suggestion;
                                                return (
                                                    <div
                                                        key={place_id}
                                                        onClick={() => ctrl.handlePlaceSelect(suggestion.description, place_id)}
                                                        style={{
                                                            padding: '9px 12px', cursor: 'pointer',
                                                            borderBottom: '1px solid #f5f5f5',
                                                            transition: 'background-color 0.1s',
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                                                    >
                                                        <div style={{ fontWeight: '500', fontSize: '13px', color: '#202124' }}>{main_text}</div>
                                                        {secondary_text && (
                                                            <div style={{ fontSize: '11px', color: '#5f6368', marginTop: '2px' }}>{secondary_text}</div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Selected place confirmation */}
                            {ctrl.selectedPlace && (
                                <div style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                                    padding: '10px 12px', backgroundColor: '#E8F5E9', borderRadius: '10px',
                                    border: '1.5px solid #C8E6C9', marginBottom: '14px',
                                }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span style={{ fontSize: '12px', color: '#2E7D32', fontWeight: '500', lineHeight: '1.4' }}>
                                        {ctrl.selectedPlace.address}
                                    </span>
                                </div>
                            )}

                            {/* Custom name input */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#5f6368', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Save location as
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Home, Work, Gym…"
                                    value={ctrl.customName}
                                    onChange={e => ctrl.setCustomName(e.target.value)}
                                    maxLength={40}
                                    style={{
                                        width: '100%', padding: '9px 12px', borderRadius: '10px',
                                        border: '1.5px solid #e0e0e0', outline: 'none',
                                        fontSize: '14px', color: '#202124', backgroundColor: 'white',
                                        boxSizing: 'border-box', transition: 'border-color 0.15s',
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#2E7D32'}
                                    onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                                    onKeyDown={e => { if (e.key === 'Enter') ctrl.handleSave(); }}
                                />
                            </div>

                            {/* Error */}
                            {ctrl.addError && (
                                <div style={{
                                    padding: '9px 12px', backgroundColor: '#FFEBEE', borderRadius: '8px',
                                    fontSize: '12px', color: '#c62828', marginBottom: '12px',
                                }}>
                                    {ctrl.addError}
                                </div>
                            )}

                            {/* Save / Reset */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={ctrl.handleSave}
                                    disabled={ctrl.addLoading}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                                        backgroundColor: ctrl.addLoading ? '#A5D6A7' : '#2E7D32', color: 'white',
                                        fontSize: '14px', fontWeight: '700', cursor: ctrl.addLoading ? 'not-allowed' : 'pointer',
                                        transition: 'background-color 0.15s',
                                    }}
                                    onMouseEnter={e => { if (!ctrl.addLoading) e.currentTarget.style.backgroundColor = '#1B5E20'; }}
                                    onMouseLeave={e => { if (!ctrl.addLoading) e.currentTarget.style.backgroundColor = '#2E7D32'; }}
                                >
                                    {ctrl.addLoading ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                    onClick={ctrl.handleReset}
                                    disabled={ctrl.addLoading}
                                    style={{
                                        padding: '10px 16px', borderRadius: '10px',
                                        border: '1.5px solid #e0e0e0', backgroundColor: 'white',
                                        fontSize: '14px', fontWeight: '600', color: '#5f6368', cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f5f5f5'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; }}
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}
