/* StopDetailPanel — departure board showing all routes & predictions for a selected stop */
import React from 'react';
import { StopDetailPanelProps } from '../../../models/components/StopDetailPanelProps';
import { useStopDetailController, RouteGroup } from '../../../controllers/useStopDetailController';

export default function StopDetailPanel({ stop, onClose }: StopDetailPanelProps) {
    const {
        routeGroups, allRoutes, loading, error,
        lastRefreshed, handleRefresh
    } = useStopDetailController(stop.STOP_ID);

    const crossStreet = stop.ONSTREET && stop.ATSTREET
        ? `${stop.ONSTREET} @ ${stop.ATSTREET}`
        : '';

    return (
        <div style={panelStyle}>
            {/* Header */}
            <div style={headerStyle}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '16px', color: '#202124' }}>
                        {stop.STOP_NAME}
                    </div>
                    {crossStreet && (
                        <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '2px' }}>
                            {crossStreet}
                        </div>
                    )}
                    <div style={{
                        display: 'inline-block', marginTop: '6px',
                        fontSize: '11px', color: '#5f6368',
                        backgroundColor: '#f1f3f4', padding: '2px 8px',
                        borderRadius: '6px'
                    }}>
                        Stop #{stop.STOP_ID}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        title="Refresh predictions"
                        style={{
                            background: 'none', border: '1px solid #dadce0', borderRadius: '50%',
                            width: '32px', height: '32px', cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', color: '#5f6368', opacity: loading ? 0.5 : 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        {loading ? (
                            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span>
                        ) : '↻'}
                    </button>
                    <button onClick={onClose} style={closeBtnStyle}>✕</button>
                </div>
            </div>

            {/* Route badge strip */}
            <div style={badgeStripStyle}>
                {allRoutes.map(routeNum => {
                    const group = routeGroups.find(g => g.routeId === routeNum);
                    const color = group?.routeColor || '#9aa0a6';
                    return (
                        <span key={routeNum} style={{
                            backgroundColor: color,
                            color: 'white',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            opacity: group ? 1 : 0.4,
                        }}>
                            {routeNum}
                        </span>
                    );
                })}
            </div>

            {/* Content */}
            <div style={contentStyle}>
                {loading && (
                    <div style={statusStyle}>
                        <div style={spinnerStyle} />
                        <span>Loading departures...</span>
                    </div>
                )}

                {error && (
                    <div style={errorStyle}>
                        {error}
                        <button
                            onClick={handleRefresh}
                            style={{
                                marginLeft: '8px', background: 'none', border: '1px solid #d93025',
                                borderRadius: '6px', padding: '4px 12px', cursor: 'pointer',
                                fontSize: '12px', color: '#d93025', fontWeight: '600'
                            }}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && routeGroups.length === 0 && (
                    <div style={emptyStyle}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🕐</div>
                        <div style={{ fontWeight: '500', color: '#202124' }}>No departures scheduled</div>
                        <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px' }}>
                            There are no predicted arrivals for this stop right now
                        </div>
                    </div>
                )}

                {routeGroups.map((group, i) => (
                    <RouteCard key={group.routeId} group={group} isNearest={i === 0 && group.hasLiveData} />
                ))}
            </div>

            {/* Footer */}
            <div style={footerStyle}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        backgroundColor: '#34a853', display: 'inline-block',
                        animation: 'pulse 2s infinite',
                    }} />
                    Auto-refreshing every 30s
                </span>
                {lastRefreshed && (
                    <span>Updated {formatTimeAgo(lastRefreshed)}</span>
                )}
            </div>

            <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes chipPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(26, 115, 232, 0.3); }
                    50% { box-shadow: 0 0 0 6px rgba(26, 115, 232, 0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}

function RouteCard({ group, isNearest }: { group: RouteGroup; isNearest: boolean }) {
    return (
        <div style={{
            backgroundColor: group.hasLiveData ? '#f8f9fa' : '#fafafa',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '10px',
            border: '1px solid #e8eaed',
            borderLeft: `4px solid ${group.routeColor}`,
            opacity: group.hasLiveData ? 1 : 0.7,
        }}>
            {/* Route header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: group.predictions.length > 0 ? '10px' : '0' }}>
                <span style={{
                    backgroundColor: group.routeColor,
                    color: 'white',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '700',
                }}>
                    Route {group.routeId}
                </span>
                {group.lineName ? (
                    <span style={{ color: '#202124', fontSize: '14px', fontWeight: '500' }}>
                        {group.lineName}
                    </span>
                ) : null}
                {group.hasLiveData && (
                    <span style={{
                        marginLeft: 'auto',
                        fontSize: '10px', fontWeight: '600', color: '#137333',
                        backgroundColor: '#e6f4ea', padding: '2px 8px', borderRadius: '8px',
                    }}>
                        LIVE
                    </span>
                )}
            </div>

            {/* No predictions message */}
            {group.predictions.length === 0 && (
                <div style={{ fontSize: '12px', color: '#80868b', marginTop: '8px' }}>
                    No upcoming buses on this route
                </div>
            )}

            {/* All predictions as rows — scrollable within each route */}
            {group.predictions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', maxHeight: '200px', overflowY: 'auto' }}>
                    {group.predictions.map((pred, i) => {
                        const isNext = i === 0 && isNearest;
                        const isArriving = pred.minutesAway <= 3;
                        return (
                            <div key={i} style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '6px 8px',
                                borderRadius: '8px',
                                backgroundColor: isNext ? '#e8f5e9' : (i % 2 === 0 ? 'transparent' : '#f1f3f4'),
                                animation: isNext ? 'chipPulse 2s ease-in-out infinite' : 'none',
                            }}>
                                {/* Countdown */}
                                <span style={{
                                    width: '60px',
                                    fontSize: isNext ? '15px' : '13px',
                                    fontWeight: '700',
                                    color: isArriving ? '#137333' : '#202124',
                                    fontVariantNumeric: 'tabular-nums',
                                    flexShrink: 0,
                                }}>
                                    {pred.minutesAway <= 0 ? 'NOW' : `${pred.minutesAway} min`}
                                </span>
                                {/* Time */}
                                <span style={{
                                    width: '72px',
                                    fontSize: '12px',
                                    color: '#5f6368',
                                    flexShrink: 0,
                                }}>
                                    {pred.predTime.trim()}
                                </span>
                                {/* Bus ID or Scheduled */}
                                <span style={{
                                    fontSize: '11px',
                                    color: pred.isLive ? '#1a73e8' : '#9aa0a6',
                                    fontWeight: pred.isLive ? '500' : '400',
                                    flex: 1,
                                }}>
                                    {pred.busId ? `Bus #${pred.busId}` : 'Scheduled'}
                                </span>
                                {/* Last stop badge */}
                                {pred.isLastStop && (
                                    <span style={{
                                        backgroundColor: '#d93025', color: 'white',
                                        fontSize: '9px', fontWeight: '700',
                                        padding: '1px 5px', borderRadius: '6px',
                                        flexShrink: 0,
                                    }}>
                                        LAST
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function formatTimeAgo(date: Date): string {
    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.round(seconds / 60)}m ago`;
}

// -------- Styles --------

const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: '55px',
    right: '10px',
    width: '400px',
    maxHeight: 'calc(100vh - 70px)',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    zIndex: 1500,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '14px 18px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e8eaed',
};

const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#5f6368',
    padding: '4px 8px',
    borderRadius: '50%',
};

const badgeStripStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '10px 18px',
    borderBottom: '1px solid #e8eaed',
    backgroundColor: '#f8f9fa',
};

const contentStyle: React.CSSProperties = {
    padding: '14px',
    overflowY: 'auto',
    flex: 1,
};

const statusStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '24px',
    justifyContent: 'center',
    fontSize: '14px',
    color: '#5f6368',
};

const spinnerStyle: React.CSSProperties = {
    width: '14px',
    height: '14px',
    border: '2px solid #dadce0',
    borderTop: '2px solid #1a73e8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    display: 'inline-block',
};

const errorStyle: React.CSSProperties = {
    color: '#d93025',
    fontSize: '13px',
    padding: '8px 12px',
    backgroundColor: '#fce8e6',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
};

const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '32px 16px',
};

const footerStyle: React.CSSProperties = {
    padding: '8px 18px',
    borderTop: '1px solid #e8eaed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#80868b',
};
