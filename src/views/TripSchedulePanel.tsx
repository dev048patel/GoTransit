import { Link } from 'react-router-dom';
import { SavedDestination } from '../models/transit/SavedDestination';
import { TripOption } from '../models/transit/RoutePlanning';
import { computeDepartBy } from '../models/transit/TripSchedule';
import type { useTripScheduleController } from '../controllers/useTripScheduleController';
import transitColors from '../models/data/transitColors';

type Ctrl = ReturnType<typeof useTripScheduleController>;

interface TripSchedulePanelProps {
    ctrl: Ctrl;
    onPreviewLocation?: (place: { id: string; displayName: string; location: { lat: number; lng: number } }) => void;
}

const getRouteColor = (routeNum: string) => {
    const match = transitColors.find(c => c.route_id === parseInt(routeNum));
    return match ? match.colour : '#1a73e8';
};

/* ── Location dropdown ────────────────────────────────────────── */
function LocationSelect({
    label,
    value,
    options,
    excluded,
    loading,
    onChange,
    onPreview,
}: {
    label: string;
    value: string | null;
    options: SavedDestination[];
    excluded: string | null;
    loading: boolean;
    onChange: (id: string | null) => void;
    onPreview?: (dest: SavedDestination) => void;
}) {
    const available = options.filter(d => d.id !== excluded);
    return (
        <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#5f6368', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
            </label>
            <div style={{ position: 'relative' }}>
                <select
                    value={value || ''}
                    disabled={loading}
                    onChange={e => {
                        const id = e.target.value || null;
                        onChange(id);
                        if (id && onPreview) {
                            const dest = options.find(d => d.id === id);
                            if (dest) onPreview(dest);
                        }
                    }}
                    style={{
                        width: '100%', padding: '9px 32px 9px 12px', borderRadius: '10px',
                        border: '1.5px solid #e0e0e0', outline: 'none', fontSize: '14px',
                        color: value ? '#202124' : '#9e9e9e', backgroundColor: loading ? '#f5f5f5' : 'white',
                        appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235f6368' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                        transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#1a73e8'}
                    onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                >
                    <option value="">Select a saved location…</option>
                    {available.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>
            {!loading && available.length === 0 && options.length > 0 && (
                <div style={{ fontSize: '11px', color: '#5f6368', marginTop: '4px' }}>
                    Only one location available (the other is already selected).
                </div>
            )}
        </div>
    );
}

/* ── Route result card ────────────────────────────────────────── */
function RouteCard({
    option,
    arriveBy,
    selected,
    onSelect,
}: {
    option: TripOption;
    arriveBy: string;
    selected: boolean;
    onSelect: () => void;
}) {
    const departBy = computeDepartBy(arriveBy, option.totalTime);
    const color = getRouteColor(option.segments[0]?.routeNum);

    return (
        <div
            onClick={onSelect}
            style={{
                display: 'flex', gap: '10px', padding: '12px',
                borderRadius: '12px', marginBottom: '8px',
                border: `1.5px solid ${selected ? color : '#e8e8e8'}`,
                backgroundColor: selected ? '#f8f9fa' : 'white',
                cursor: 'pointer', transition: 'all 0.15s',
                borderLeft: `4px solid ${color}`,
            }}
        >
            {/* Radio dot */}
            <div style={{
                width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                border: `2px solid ${selected ? color : '#bdbdbd'}`,
                backgroundColor: selected ? color : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {selected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'white' }} />}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Route badges */}
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {option.segments.map((seg, i) => (
                        <span key={i} style={{
                            fontSize: '11px', fontWeight: '700', color: 'white',
                            backgroundColor: getRouteColor(seg.routeNum),
                            padding: '2px 8px', borderRadius: '8px',
                        }}>
                            Route {seg.routeNum}
                        </span>
                    ))}
                    <span style={{
                        fontSize: '11px', fontWeight: '600',
                        color: option.transfers === 0 ? '#137333' : '#e37400',
                        backgroundColor: option.transfers === 0 ? '#e6f4ea' : '#fef7e0',
                        padding: '2px 8px', borderRadius: '8px',
                    }}>
                        {option.transfers === 0 ? 'Direct' : `${option.transfers} transfer`}
                    </span>
                </div>

                {/* Timing — the key info */}
                <div style={{ fontSize: '14px', color: '#202124', marginBottom: '3px' }}>
                    <span style={{ fontWeight: '700' }}>Leave by </span>
                    <span style={{ fontWeight: '800', color: '#1B5E20', fontSize: '15px' }}>{departBy}</span>
                    <span style={{ color: '#5f6368', fontSize: '13px' }}> → arrive {arriveBy}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#5f6368' }}>
                    ~{option.totalTime} min total · {option.walkToFirstStop ?? option.walkingDistance}m walk to stop
                </div>
            </div>
        </div>
    );
}

/* ── Main Panel ───────────────────────────────────────────────── */
export default function TripSchedulePanel({ ctrl, onPreviewLocation }: TripSchedulePanelProps) {
    const handlePreview = (dest: SavedDestination) => {
        onPreviewLocation?.({ id: dest.id, displayName: dest.name, location: { lat: dest.lat, lng: dest.lng } });
    };

    const fromDest = ctrl.savedDests.find(d => d.id === ctrl.fromId);
    const toDest = ctrl.savedDests.find(d => d.id === ctrl.toId);

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={ctrl.handleClose}
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 1099, top: '52px' }}
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

                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a73e8' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </div>
                        <span style={{ fontWeight: '700', fontSize: '15px', color: '#202124' }}>Route Planner</span>
                    </div>
                    <button
                        onClick={ctrl.handleClose}
                        style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', backgroundColor: '#f1f3f4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5f6368', transition: 'background-color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e0e0e0'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f3f4'}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

                    {/* Not authenticated */}
                    {!ctrl.isAuthenticated && (
                        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🚌</div>
                            <div style={{ fontWeight: '700', fontSize: '15px', color: '#202124', marginBottom: '8px' }}>Plan your route</div>
                            <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '20px', lineHeight: '1.5' }}>
                                Sign in and save locations to use the route planner.
                            </div>
                            <Link to="/login" onClick={ctrl.handleClose}>
                                <button style={{ padding: '9px 24px', borderRadius: '10px', border: 'none', backgroundColor: '#1a73e8', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                                    Sign In
                                </button>
                            </Link>
                        </div>
                    )}

                    {ctrl.isAuthenticated && (
                        <>
                            {/* Not enough saved locations */}
                            {!ctrl.destsLoading && ctrl.savedDests.length < 2 && (
                                <div style={{ padding: '12px 14px', backgroundColor: '#FFF8E1', borderRadius: '10px', border: '1.5px solid #FFE082', marginBottom: '16px', fontSize: '13px', color: '#795548', lineHeight: '1.5' }}>
                                    You need at least <strong>2 saved locations</strong> to plan a route.{' '}
                                    <Link to="/map" onClick={ctrl.handleClose} style={{ color: '#1a73e8', fontWeight: '600' }}>
                                        Add them first →
                                    </Link>
                                </div>
                            )}

                            {/* Loading state */}
                            {ctrl.destsLoading && (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#5f6368', fontSize: '13px' }}>
                                    <div style={{ width: '20px', height: '20px', border: '2.5px solid #e0e0e0', borderTop: '2.5px solid #1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
                                    Loading your saved locations…
                                </div>
                            )}

                            {/* Form */}
                            {!ctrl.destsLoading && ctrl.savedDests.length >= 2 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {/* From */}
                                    <LocationSelect
                                        label="From"
                                        value={ctrl.fromId}
                                        options={ctrl.savedDests}
                                        excluded={ctrl.toId}
                                        loading={ctrl.destsLoading}
                                        onChange={id => { ctrl.setFromId(id); ctrl.setSelectedIndex(null); }}
                                        onPreview={handlePreview}
                                    />

                                    {/* Swap arrow */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ flex: 1, height: '1px', backgroundColor: '#f0f0f0' }} />
                                        <button
                                            onClick={() => {
                                                const tmp = ctrl.fromId;
                                                ctrl.setFromId(ctrl.toId);
                                                ctrl.setToId(tmp);
                                                ctrl.setSelectedIndex(null);
                                            }}
                                            title="Swap From and To"
                                            style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid #e0e0e0', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5f6368', flexShrink: 0, transition: 'all 0.15s' }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a73e8'; e.currentTarget.style.color = '#1a73e8'; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.color = '#5f6368'; }}
                                        >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                                <path d="M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3" />
                                            </svg>
                                        </button>
                                        <div style={{ flex: 1, height: '1px', backgroundColor: '#f0f0f0' }} />
                                    </div>

                                    {/* To */}
                                    <LocationSelect
                                        label="To"
                                        value={ctrl.toId}
                                        options={ctrl.savedDests}
                                        excluded={ctrl.fromId}
                                        loading={ctrl.destsLoading}
                                        onChange={id => { ctrl.setToId(id); ctrl.setSelectedIndex(null); }}
                                        onPreview={handlePreview}
                                    />

                                    {/* Arrive by */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#5f6368', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Arrive by
                                        </label>
                                        <input
                                            type="time"
                                            value={ctrl.arriveBy}
                                            onChange={e => { ctrl.setArriveBy(e.target.value); ctrl.setSelectedIndex(null); }}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #e0e0e0', fontSize: '15px', fontWeight: '600', color: '#202124', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                                            onFocus={e => e.target.style.borderColor = '#1a73e8'}
                                            onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                                        />
                                    </div>

                                    {/* Find Buses button */}
                                    <button
                                        onClick={ctrl.handleFindBuses}
                                        disabled={ctrl.calculating || !ctrl.fromId || !ctrl.toId}
                                        style={{
                                            width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
                                            backgroundColor: ctrl.calculating || !ctrl.fromId || !ctrl.toId ? '#b3d4fc' : '#1a73e8',
                                            color: 'white', fontSize: '14px', fontWeight: '700',
                                            cursor: ctrl.calculating || !ctrl.fromId || !ctrl.toId ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                                            transition: 'background-color 0.15s',
                                        }}
                                        onMouseEnter={e => { if (!ctrl.calculating && ctrl.fromId && ctrl.toId) e.currentTarget.style.backgroundColor = '#1557b0'; }}
                                        onMouseLeave={e => { if (!ctrl.calculating && ctrl.fromId && ctrl.toId) e.currentTarget.style.backgroundColor = '#1a73e8'; }}
                                    >
                                        {ctrl.calculating ? (
                                            <>
                                                <div style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                                Finding routes…
                                            </>
                                        ) : (
                                            <>
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                                </svg>
                                                Find Buses
                                            </>
                                        )}
                                    </button>

                                    {/* Error */}
                                    {ctrl.calcError && (
                                        <div style={{ padding: '10px 12px', backgroundColor: '#FFEBEE', borderRadius: '8px', fontSize: '13px', color: '#c62828' }}>
                                            {ctrl.calcError}
                                        </div>
                                    )}

                                    {/* No results */}
                                    {!ctrl.calculating && !ctrl.calcError && ctrl.options.length === 0 && ctrl.fromId && ctrl.toId && (
                                        <div style={{ textAlign: 'center', padding: '20px', fontSize: '13px', color: '#9e9e9e' }}>
                                            Hit "Find Buses" to see route options.
                                        </div>
                                    )}

                                    {/* Results */}
                                    {ctrl.options.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#5f6368', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {fromDest?.name} → {toDest?.name}
                                            </div>
                                            {ctrl.options.map((opt, i) => (
                                                <RouteCard
                                                    key={i}
                                                    option={opt}
                                                    arriveBy={ctrl.arriveBy}
                                                    selected={ctrl.selectedIndex === i}
                                                    onSelect={() => ctrl.setSelectedIndex(i)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer — only shown when there are results */}
                {ctrl.isAuthenticated && ctrl.options.length > 0 && (
                    <div style={{ padding: '12px 14px', borderTop: '1px solid #f0f0f0', flexShrink: 0 }}>
                        <button
                            onClick={ctrl.handleReset}
                            style={{ width: '100%', padding: '9px', borderRadius: '10px', border: '1.5px solid #e0e0e0', backgroundColor: 'white', fontSize: '13px', fontWeight: '600', color: '#5f6368', cursor: 'pointer', transition: 'background-color 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                        >
                            Reset
                        </button>
                    </div>
                )}
            </div>

            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </>
    );
}
