/* StopDetailPanel — dark-themed departure board showing all routes & predictions for a selected stop */
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
                    <div style={{ fontWeight: '700', fontSize: '17px', color: '#e6edf3' }}>
                        {stop.STOP_NAME}
                    </div>
                    {crossStreet && (
                        <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '2px' }}>
                            {crossStreet}
                        </div>
                    )}
                    <div style={{
                        display: 'inline-block', marginTop: '6px',
                        fontSize: '11px', color: '#8b949e',
                        backgroundColor: '#21262d', padding: '2px 8px',
                        borderRadius: '6px', border: '1px solid #30363d'
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
                            background: 'none', border: '1px solid #30363d', borderRadius: '50%',
                            width: '32px', height: '32px', cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', color: '#8b949e', opacity: loading ? 0.5 : 1,
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
                    const color = group?.routeColor || '#6e7681';
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
                                marginLeft: '8px', background: 'none', border: '1px solid #f85149',
                                borderRadius: '6px', padding: '4px 12px', cursor: 'pointer',
                                fontSize: '12px', color: '#f85149', fontWeight: '600'
                            }}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && routeGroups.length === 0 && (
                    <div style={emptyStyle}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🕐</div>
                        <div style={{ fontWeight: '500', color: '#c9d1d9' }}>No departures scheduled</div>
                        <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px' }}>
                            There are no predicted arrivals for this stop right now
                        </div>
                    </div>
                )}

                {routeGroups.map((group, i) => (
                    <RouteCard key={group.routeId} group={group} isNearest={i === 0} />
                ))}
            </div>

            {/* Footer */}
            <div style={footerStyle}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        backgroundColor: '#3fb950', display: 'inline-block',
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
                    0%, 100% { box-shadow: 0 0 0 0 rgba(63, 185, 80, 0.4); }
                    50% { box-shadow: 0 0 0 6px rgba(63, 185, 80, 0); }
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
            backgroundColor: '#161b22',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '10px',
            borderLeft: `4px solid ${group.routeColor}`,
            border: `1px solid #30363d`,
            borderLeftWidth: '4px',
            borderLeftColor: group.routeColor,
        }}>
            {/* Route header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
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
                <span style={{ color: '#c9d1d9', fontSize: '14px', fontWeight: '500' }}>
                    {group.lineName}
                </span>
            </div>

            {group.endTime && (
                <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '10px' }}>
                    Service until {group.endTime}
                </div>
            )}

            {/* Prediction countdown chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {group.predictions.map((pred, i) => {
                    const isNext = i === 0 && isNearest;
                    const isArriving = pred.minutesAway <= 3;
                    return (
                        <div key={i} style={{
                            backgroundColor: isNext ? '#1a3a2a' : '#21262d',
                            border: isNext ? '1px solid #238636' : '1px solid #30363d',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            textAlign: 'center',
                            minWidth: '72px',
                            position: 'relative',
                            animation: isNext ? 'chipPulse 2s ease-in-out infinite' : 'none',
                        }}>
                            {/* Countdown */}
                            <div style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                color: isArriving ? '#3fb950' : '#e6edf3',
                                fontVariantNumeric: 'tabular-nums',
                            }}>
                                {pred.minutesAway <= 0 ? 'NOW' : `${pred.minutesAway}m`}
                            </div>
                            {/* Actual time */}
                            <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '2px' }}>
                                {pred.predTime.trim()}
                            </div>
                            {/* Bus ID */}
                            <div style={{ fontSize: '10px', color: '#6e7681', marginTop: '2px' }}>
                                Bus #{pred.busId}
                            </div>
                            {/* Last stop badge */}
                            {pred.isLastStop && (
                                <div style={{
                                    position: 'absolute', top: '-6px', right: '-6px',
                                    backgroundColor: '#da3633', color: 'white',
                                    fontSize: '9px', fontWeight: '700',
                                    padding: '1px 5px', borderRadius: '6px',
                                }}>
                                    LAST
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
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
    backgroundColor: '#0d1117',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
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
    padding: '16px 18px 12px',
    backgroundColor: '#161b22',
    borderBottom: '1px solid #30363d',
};

const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#8b949e',
    padding: '4px 8px',
    borderRadius: '50%',
};

const badgeStripStyle: React.CSSProperties = {
    display: 'flex',
    gap: '6px',
    padding: '10px 18px',
    overflowX: 'auto',
    borderBottom: '1px solid #30363d',
    backgroundColor: '#161b22',
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
    color: '#8b949e',
};

const spinnerStyle: React.CSSProperties = {
    width: '14px',
    height: '14px',
    border: '2px solid #30363d',
    borderTop: '2px solid #58a6ff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    display: 'inline-block',
};

const errorStyle: React.CSSProperties = {
    color: '#f85149',
    fontSize: '13px',
    padding: '8px 12px',
    backgroundColor: '#2d1215',
    borderRadius: '8px',
    border: '1px solid #f8514933',
    display: 'flex',
    alignItems: 'center',
};

const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '32px 16px',
};

const footerStyle: React.CSSProperties = {
    padding: '8px 18px',
    borderTop: '1px solid #30363d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#6e7681',
};
