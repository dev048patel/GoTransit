import React from 'react';
import { Link } from 'react-router-dom';
import { SavedDestination } from '../models/transit/SavedDestination';
import { TripOption } from '../models/transit/RoutePlanning';
import { DAY_LABELS, WEEKDAY_INDICES } from '../models/transit/WeeklySchedule';
import { computeDepartBy } from '../models/transit/TripSchedule';
import transitColors from '../models/data/transitColors';
import type { useWeeklyPlannerController, DayState } from '../controllers/useWeeklyPlannerController';

type Ctrl = ReturnType<typeof useWeeklyPlannerController>;

const getRouteColor = (routeNum: string | null | undefined) => {
    if (!routeNum) return '#2E7D32';
    const match = transitColors.find(c => c.route_id === parseInt(routeNum));
    return match ? match.colour : '#2E7D32';
};

/* ── Day pill ─────────────────────────────────────────────────── */
function DayPill({
    dayIndex, label, selected, day,
    onClick,
}: {
    dayIndex: number; label: string; selected: boolean; day: DayState;
    onClick: () => void;
}) {
    const hasRoute = !!day.routeNum;
    const isSet = !!day.fromId && !!day.toId;

    return (
        <button
            onClick={onClick}
            style={{
                flex: 1,
                padding: '8px 4px 10px',
                borderRadius: '10px',
                border: selected ? '2px solid #2E7D32' : '2px solid transparent',
                backgroundColor: selected ? '#E8F5E9' : '#F5F5F5',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s',
                outline: 'none',
            }}
        >
            <span style={{
                fontSize: '11px', fontWeight: '700',
                color: selected ? '#2E7D32' : isSet ? '#424242' : '#9E9E9E',
                letterSpacing: '0.04em',
            }}>
                {label}
            </span>
            {/* Indicator dot */}
            <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: day.enabled && hasRoute ? '#2E7D32'
                    : isSet ? '#BDBDBD'
                        : 'transparent',
                border: isSet && !(day.enabled && hasRoute) ? '1.5px solid #BDBDBD' : 'none',
            }} />
        </button>
    );
}

/* ── Location dropdown ────────────────────────────────────────── */
function LocationSelect({
    label, value, options, excluded, loading, onChange,
}: {
    label: string; value: string | null; options: SavedDestination[];
    excluded: string | null; loading: boolean; onChange: (id: string | null) => void;
}) {
    const available = options.filter(d => d.id !== excluded);
    return (
        <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#757575', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
            </label>
            <div style={{ position: 'relative' }}>
                <select
                    value={value || ''}
                    disabled={loading}
                    onChange={e => onChange(e.target.value || null)}
                    style={{
                        width: '100%', padding: '9px 30px 9px 11px', borderRadius: '10px',
                        border: '1.5px solid #E0E0E0', outline: 'none', fontSize: '13px',
                        color: value ? '#202124' : '#9E9E9E',
                        backgroundColor: loading ? '#FAFAFA' : 'white',
                        appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%239E9E9E' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                        transition: 'border-color 0.15s',
                        boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#2E7D32'; }}
                    onBlur={e => { e.target.style.borderColor = '#E0E0E0'; }}
                >
                    <option value="">Select a saved location…</option>
                    {available.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>
        </div>
    );
}

/* ── Compact route card for pinning ──────────────────────────── */
function RouteCard({
    option, arriveBy, pinned, onPin,
}: {
    option: TripOption; arriveBy: string; pinned: boolean; onPin: () => void;
}) {
    const departBy = computeDepartBy(arriveBy, option.totalTime);
    const color = getRouteColor(option.segments[0]?.routeNum);

    return (
        <div
            onClick={onPin}
            style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '10px', marginBottom: '6px',
                border: `1.5px solid ${pinned ? color : '#EEEEEE'}`,
                backgroundColor: pinned ? '#F9FBF9' : 'white',
                cursor: 'pointer', transition: 'all 0.15s',
                borderLeft: `4px solid ${color}`,
            }}
        >
            {/* Radio */}
            <div style={{
                width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${pinned ? color : '#BDBDBD'}`,
                backgroundColor: pinned ? color : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {pinned && <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'white' }} />}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Route + transfer badges */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    {option.segments.map((seg, i) => (
                        <span key={i} style={{
                            fontSize: '10px', fontWeight: '700', color: 'white',
                            backgroundColor: getRouteColor(seg.routeNum),
                            padding: '2px 7px', borderRadius: '6px',
                        }}>
                            Rt {seg.routeNum}
                        </span>
                    ))}
                    <span style={{
                        fontSize: '10px', fontWeight: '600',
                        color: option.transfers === 0 ? '#2E7D32' : '#795548',
                        backgroundColor: option.transfers === 0 ? '#E8F5E9' : '#EFEBE9',
                        padding: '2px 7px', borderRadius: '6px',
                    }}>
                        {option.transfers === 0 ? 'Direct' : `${option.transfers} transfer`}
                    </span>
                </div>

                {/* Leave by + duration */}
                <div style={{ fontSize: '13px', color: '#202124' }}>
                    <span style={{ fontWeight: '700' }}>Leave </span>
                    <span style={{ fontWeight: '800', color: '#1B5E20', fontSize: '14px' }}>{departBy}</span>
                    <span style={{ color: '#757575', fontSize: '12px' }}> · ~{option.totalTime} min</span>
                </div>
            </div>
        </div>
    );
}

/* ── Main Panel ───────────────────────────────────────────────── */
export default function WeeklyPlannerPanel({ ctrl }: { ctrl: Ctrl }) {
    const day = ctrl.days[ctrl.selectedDay];

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={ctrl.handleClose}
                style={{
                    position: 'fixed', inset: 0, top: '52px',
                    backgroundColor: 'rgba(0,0,0,0.18)', zIndex: 1099,
                }}
            />

            {/* Panel */}
            <div style={{
                position: 'fixed', top: '52px', right: 0,
                width: 'min(360px, 100vw)',
                height: 'calc(100vh - 52px)',
                backgroundColor: 'white',
                boxShadow: '-4px 0 24px rgba(0,0,0,0.10)',
                zIndex: 1100,
                display: 'flex', flexDirection: 'column',
                borderRadius: '16px 0 0 0',
                overflow: 'hidden',
            }}>

                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px 12px', borderBottom: '1px solid #F0F0F0', flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '8px',
                            backgroundColor: '#E8F5E9', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: '#2E7D32',
                        }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" />
                                <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
                            </svg>
                        </div>
                        <div>
                            <div style={{ fontWeight: '700', fontSize: '14px', color: '#202124', lineHeight: 1.2 }}>
                                My Weekly Commute
                            </div>
                            <div style={{ fontSize: '11px', color: '#9E9E9E' }}>
                                Set your recurring routes
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={ctrl.handleClose}
                        style={{
                            width: '28px', height: '28px', borderRadius: '8px',
                            border: 'none', backgroundColor: '#F5F5F5', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#757575', transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#E0E0E0'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F5F5F5'; }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Not authenticated */}
                {!ctrl.isAuthenticated && (
                    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                        <div style={{ fontSize: '34px', marginBottom: '12px' }}>🗓️</div>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#202124', marginBottom: '8px' }}>Plan your weekly commute</div>
                        <div style={{ fontSize: '13px', color: '#757575', marginBottom: '20px', lineHeight: '1.5' }}>
                            Sign in to save your weekly schedule and get departure reminders.
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

                {ctrl.isAuthenticated && (
                    <>
                        {/* Day pill selector */}
                        <div style={{
                            padding: '12px 14px 0',
                            borderBottom: '1px solid #F0F0F0', flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                                {WEEKDAY_INDICES.map(d => (
                                    <DayPill
                                        key={d}
                                        dayIndex={d}
                                        label={DAY_LABELS[d]}
                                        selected={ctrl.selectedDay === d}
                                        day={ctrl.days[d]}
                                        onClick={() => ctrl.setSelectedDay(d)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Body — scrollable */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

                            {ctrl.loading && (
                                <div style={{ textAlign: 'center', padding: '24px', color: '#9E9E9E', fontSize: '13px' }}>
                                    <div style={{
                                        width: '18px', height: '18px',
                                        border: '2px solid #E0E0E0', borderTop: '2px solid #2E7D32',
                                        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                                        margin: '0 auto 8px',
                                    }} />
                                    Loading your schedule…
                                </div>
                            )}

                            {!ctrl.loading && ctrl.savedDests.length < 2 && (
                                <div style={{
                                    padding: '12px 14px', backgroundColor: '#FFFDE7',
                                    borderRadius: '10px', border: '1.5px solid #FFF176',
                                    fontSize: '13px', color: '#795548', lineHeight: '1.5', marginBottom: '16px',
                                }}>
                                    You need at least <strong>2 saved locations</strong> to set up a commute.{' '}
                                    <Link to="/map" onClick={ctrl.handleClose} style={{ color: '#2E7D32', fontWeight: '600' }}>
                                        Add them →
                                    </Link>
                                </div>
                            )}

                            {!ctrl.loading && ctrl.savedDests.length >= 2 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                                    {/* Enable toggle for this day */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 12px', borderRadius: '10px',
                                        backgroundColor: day.enabled ? '#E8F5E9' : '#FAFAFA',
                                        border: `1.5px solid ${day.enabled ? '#A5D6A7' : '#EEEEEE'}`,
                                        transition: 'all 0.15s',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={day.enabled ? '#2E7D32' : '#9E9E9E'} strokeWidth="2" strokeLinecap="round">
                                                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                                <path d="M13.73 21a2 2 0 01-3.46 0" />
                                            </svg>
                                            <span style={{ fontSize: '13px', fontWeight: '600', color: day.enabled ? '#2E7D32' : '#9E9E9E' }}>
                                                {day.enabled ? `Reminders on for ${DAY_LABELS[ctrl.selectedDay]}` : `Reminders off for ${DAY_LABELS[ctrl.selectedDay]}`}
                                            </span>
                                        </div>
                                        {/* Toggle switch */}
                                        <div
                                            onClick={() => ctrl.updateDay(ctrl.selectedDay, { enabled: !day.enabled })}
                                            style={{
                                                width: '36px', height: '20px', borderRadius: '10px',
                                                backgroundColor: day.enabled ? '#2E7D32' : '#BDBDBD',
                                                cursor: 'pointer', position: 'relative',
                                                transition: 'background-color 0.2s', flexShrink: 0,
                                            }}
                                        >
                                            <div style={{
                                                position: 'absolute', top: '3px',
                                                left: day.enabled ? '19px' : '3px',
                                                width: '14px', height: '14px', borderRadius: '50%',
                                                backgroundColor: 'white',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                                transition: 'left 0.2s',
                                            }} />
                                        </div>
                                    </div>

                                    {/* From / To */}
                                    <LocationSelect
                                        label="From"
                                        value={day.fromId}
                                        options={ctrl.savedDests}
                                        excluded={day.toId}
                                        loading={ctrl.destsLoading}
                                        onChange={id => ctrl.updateDay(ctrl.selectedDay, { fromId: id, options: [], calcError: '' })}
                                    />

                                    {/* Swap button */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ flex: 1, height: '1px', backgroundColor: '#F0F0F0' }} />
                                        <button
                                            title="Swap From and To"
                                            onClick={() => ctrl.updateDay(ctrl.selectedDay, {
                                                fromId: day.toId, toId: day.fromId, options: [], calcError: '',
                                            })}
                                            style={{
                                                width: '26px', height: '26px', borderRadius: '50%',
                                                border: '1.5px solid #E0E0E0', backgroundColor: 'white',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', color: '#9E9E9E', flexShrink: 0, transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#2E7D32'; e.currentTarget.style.color = '#2E7D32'; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0E0E0'; e.currentTarget.style.color = '#9E9E9E'; }}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                                <path d="M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3" />
                                            </svg>
                                        </button>
                                        <div style={{ flex: 1, height: '1px', backgroundColor: '#F0F0F0' }} />
                                    </div>

                                    <LocationSelect
                                        label="To"
                                        value={day.toId}
                                        options={ctrl.savedDests}
                                        excluded={day.fromId}
                                        loading={ctrl.destsLoading}
                                        onChange={id => ctrl.updateDay(ctrl.selectedDay, { toId: id, options: [], calcError: '' })}
                                    />

                                    {/* Arrive by */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#757575', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                            Arrive by
                                        </label>
                                        <input
                                            type="time"
                                            value={day.arriveBy}
                                            onChange={e => ctrl.updateDay(ctrl.selectedDay, {
                                                arriveBy: e.target.value, options: [], calcError: '',
                                                departBy: day.routeTotalMinutes
                                                    ? computeDepartBy(e.target.value, day.routeTotalMinutes)
                                                    : null,
                                            })}
                                            style={{
                                                width: '100%', padding: '9px 11px', borderRadius: '10px',
                                                border: '1.5px solid #E0E0E0', fontSize: '14px', fontWeight: '600',
                                                color: '#202124', outline: 'none', boxSizing: 'border-box',
                                                transition: 'border-color 0.15s',
                                            }}
                                            onFocus={e => { e.target.style.borderColor = '#2E7D32'; }}
                                            onBlur={e => { e.target.style.borderColor = '#E0E0E0'; }}
                                        />
                                    </div>

                                    {/* Find Routes button */}
                                    <button
                                        onClick={() => ctrl.handleFindRoutes(ctrl.selectedDay)}
                                        disabled={day.calculating || !day.fromId || !day.toId}
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
                                            backgroundColor: day.calculating || !day.fromId || !day.toId ? '#C8E6C9' : '#2E7D32',
                                            color: 'white', fontSize: '13px', fontWeight: '700',
                                            cursor: day.calculating || !day.fromId || !day.toId ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            transition: 'background-color 0.15s',
                                        }}
                                        onMouseEnter={e => { if (!day.calculating && day.fromId && day.toId) e.currentTarget.style.backgroundColor = '#1B5E20'; }}
                                        onMouseLeave={e => { if (!day.calculating && day.fromId && day.toId) e.currentTarget.style.backgroundColor = '#2E7D32'; }}
                                    >
                                        {day.calculating ? (
                                            <>
                                                <div style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                                Calculating…
                                            </>
                                        ) : (
                                            <>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                                </svg>
                                                Find Routes
                                            </>
                                        )}
                                    </button>

                                    {day.calcError && (
                                        <div style={{ padding: '9px 11px', backgroundColor: '#FFEBEE', borderRadius: '8px', fontSize: '12px', color: '#C62828' }}>
                                            {day.calcError}
                                        </div>
                                    )}

                                    {/* Route options */}
                                    {day.options.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#9E9E9E', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                Select a route to pin
                                            </div>
                                            {day.options.map((opt, i) => (
                                                <RouteCard
                                                    key={i}
                                                    option={opt}
                                                    arriveBy={day.arriveBy}
                                                    pinned={day.routeNum === (opt.segments[0]?.routeNum ?? null) && day.routeTotalMinutes === opt.totalTime}
                                                    onPin={() => ctrl.handlePinRoute(ctrl.selectedDay, opt)}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Pinned route summary */}
                                    {day.routeNum && day.departBy && day.options.length === 0 && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '10px 12px', backgroundColor: '#E8F5E9',
                                            borderRadius: '10px', border: '1.5px solid #A5D6A7',
                                        }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            <div style={{ fontSize: '12px' }}>
                                                <span style={{ fontWeight: '700', color: '#1B5E20' }}>Route {day.routeNum}</span>
                                                <span style={{ color: '#2E7D32' }}> · Leave by </span>
                                                <span style={{ fontWeight: '800', color: '#1B5E20' }}>{day.departBy}</span>
                                                {day.routeTotalMinutes && (
                                                    <span style={{ color: '#4CAF50' }}> · ~{day.routeTotalMinutes} min</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Push notifications section */}
                                    {ctrl.notifPermission !== 'unsupported' && (
                                        <div style={{
                                            padding: '12px', borderRadius: '10px',
                                            backgroundColor: '#FAFAFA',
                                            border: '1.5px dashed #E0E0E0',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#757575" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                                                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                                    <path d="M13.73 21a2 2 0 01-3.46 0" />
                                                </svg>
                                                <div>
                                                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#424242', marginBottom: '2px' }}>
                                                        {ctrl.notifPermission === 'granted' ? 'Push notifications enabled' : 'Get departure alerts'}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#9E9E9E', lineHeight: '1.4' }}>
                                                        {ctrl.notifPermission === 'granted'
                                                            ? 'You\'ll get a "time to leave" alert 15 min before your bus.'
                                                            : ctrl.notifPermission === 'denied'
                                                                ? 'Blocked in browser settings. Re-enable notifications to get alerts.'
                                                                : 'Allow notifications to get a "time to leave" alert on your device.'}
                                                    </div>
                                                </div>
                                            </div>
                                            {ctrl.notifPermission === 'default' && (
                                                <button
                                                    onClick={ctrl.handleEnableNotifications}
                                                    disabled={ctrl.subscribing}
                                                    style={{
                                                        width: '100%', padding: '8px', borderRadius: '8px',
                                                        border: '1.5px solid #2E7D32', backgroundColor: 'white',
                                                        color: '#2E7D32', fontSize: '12px', fontWeight: '700',
                                                        cursor: ctrl.subscribing ? 'not-allowed' : 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                        transition: 'all 0.15s',
                                                    }}
                                                    onMouseEnter={e => { if (!ctrl.subscribing) { e.currentTarget.style.backgroundColor = '#E8F5E9'; } }}
                                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; }}
                                                >
                                                    {ctrl.subscribing ? 'Enabling…' : 'Enable Push Notifications'}
                                                </button>
                                            )}
                                            {ctrl.notifPermission === 'granted' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#2E7D32' }} />
                                                    <span style={{ fontSize: '11px', color: '#2E7D32', fontWeight: '600' }}>Active</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {!ctrl.loading && ctrl.savedDests.length >= 2 && (
                            <div style={{ padding: '12px 14px', borderTop: '1px solid #F0F0F0', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>

                                {/* Apply to all weekdays */}
                                {(day.fromId || day.toId) && (
                                    <button
                                        onClick={ctrl.handleApplyToAll}
                                        style={{
                                            width: '100%', padding: '8px', borderRadius: '9px',
                                            border: '1.5px solid #E0E0E0', backgroundColor: 'white',
                                            fontSize: '12px', fontWeight: '600', color: '#424242',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', gap: '5px', transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F5F5F5'; }}
                                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; }}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                            <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" />
                                            <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
                                        </svg>
                                        Apply {DAY_LABELS[ctrl.selectedDay]}'s route to all weekdays
                                    </button>
                                )}

                                {/* Save error */}
                                {ctrl.saveError && (
                                    <div style={{ padding: '8px 10px', backgroundColor: '#FFEBEE', borderRadius: '8px', fontSize: '12px', color: '#C62828' }}>
                                        {ctrl.saveError}
                                    </div>
                                )}

                                {/* Save button */}
                                <button
                                    onClick={ctrl.handleSave}
                                    disabled={ctrl.saving}
                                    style={{
                                        width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
                                        backgroundColor: ctrl.saveSuccess ? '#388E3C' : ctrl.saving ? '#C8E6C9' : '#2E7D32',
                                        color: 'white', fontSize: '13px', fontWeight: '700',
                                        cursor: ctrl.saving ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                                        transition: 'background-color 0.2s',
                                    }}
                                >
                                    {ctrl.saveSuccess ? (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            Schedule Saved
                                        </>
                                    ) : ctrl.saving ? (
                                        <>
                                            <div style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                            Saving…
                                        </>
                                    ) : (
                                        <>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                                                <polyline points="17 21 17 13 7 13 7 21" />
                                                <polyline points="7 3 7 8 15 8" />
                                            </svg>
                                            Save Weekly Schedule
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </>
    );
}
