/**
 * RouteSuggestions Component
 * Displays up to 3 route suggestions from origin to destination
 */

import React from 'react';

interface RouteSegment {
    routeNum: string;
    routeName: string;
    fromStop: string;
    toStop: string;
    estimatedTime: number;
}

interface TripOption {
    segments: RouteSegment[];
    totalTime: number;
    transfers: number;
    walkingDistance: number;
    originStop: string;
    destinationStop: string;
}

interface RouteSuggestionsProps {
    options: TripOption[];
    onSelectRoute: (option: TripOption) => void;
    onClose: () => void;
}

export const RouteSuggestions: React.FC<RouteSuggestionsProps> = ({ options, onSelectRoute, onClose }) => {
    if (options.length === 0) {
        return (
            <div style={{
                position: 'absolute',
                top: '80px',
                right: '20px',
                width: '380px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                padding: '24px',
                zIndex: 1000
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Route Suggestions</h3>
                    <button
                        onClick={onClose}
                        style={{
                            border: 'none',
                            background: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '4px',
                            color: '#5f6368'
                        }}
                    >×</button>
                </div>
                <p style={{ textAlign: 'center', color: '#5f6368', padding: '40px 0' }}>
                    No routes found. Try locations closer to transit stops.
                </p>
            </div>
        );
    }

    return (
        <div style={{
            position: 'absolute',
            top: '80px',
            right: '20px',
            width: '400px',
            maxHeight: 'calc(100vh - 120px)',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid #e0e0e0'
            }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Route Suggestions</h3>
                <button
                    onClick={onClose}
                    style={{
                        border: 'none',
                        background: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#5f6368'
                    }}
                >×</button>
            </div>

            {/* Route Options */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 24px'
            }}>
                {options.map((option, index) => (
                    <div
                        key={index}
                        onClick={() => onSelectRoute(option)}
                        style={{
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '12px',
                            cursor: 'pointer',
                            border: '2px solid transparent',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#e8f0fe';
                            e.currentTarget.style.borderColor = '#1a73e8';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.borderColor = 'transparent';
                        }}
                    >
                        {/* Route Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px'
                        }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {option.segments.map((seg, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            backgroundColor: '#1a73e8',
                                            color: 'white',
                                            padding: '4px 12px',
                                            borderRadius: '16px',
                                            fontSize: '14px',
                                            fontWeight: '600'
                                        }}
                                    >
                                        Route {seg.routeNum}
                                    </div>
                                ))}
                            </div>
                            <div style={{
                                fontSize: '16px',
                                fontWeight: '600',
                                color: '#202124'
                            }}>
                                {option.totalTime} min
                            </div>
                        </div>

                        {/* Route Details */}
                        <div style={{ fontSize: '14px', color: '#5f6368', lineHeight: '1.6' }}>
                            {option.segments.map((seg, idx) => (
                                <div key={idx} style={{ marginBottom: '8px' }}>
                                    <div style={{ fontWeight: '500', color: '#202124' }}>
                                        {seg.routeName}
                                    </div>
                                    <div>
                                        From: {seg.fromStop}
                                    </div>
                                    <div>
                                        To: {seg.toStop}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer Info */}
                        <div style={{
                            display: 'flex',
                            gap: '16px',
                            marginTop: '12px',
                            paddingTop: '12px',
                            borderTop: '1px solid #e0e0e0',
                            fontSize: '13px',
                            color: '#5f6368'
                        }}>
                            <div>
                                {option.transfers === 0 ? 'Direct' : `${option.transfers} transfer${option.transfers > 1 ? 's' : ''}`}
                            </div>
                            <div>
                                ~{Math.round(option.walkingDistance)}m walk
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RouteSuggestions;
