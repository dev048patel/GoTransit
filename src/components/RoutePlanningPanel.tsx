/**
 * RoutePlanningPanel
 * Control panel for setting origin, destination, and viewing route suggestions
 */

import React from 'react';

interface RoutePlanningPanelProps {
    hasOrigin: boolean;
    hasDestination: boolean;
    onGetLocation: () => void;
    onGetRoutes: () => void;
}

export const RoutePlanningPanel: React.FC<RoutePlanningPanelProps> = ({
    hasOrigin,
    hasDestination,
    onGetLocation,
    onGetRoutes
}) => {
    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '20px',
            minWidth: '280px',
            zIndex: 1000
        }}>
            <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#202124'
            }}>
                Plan Your Trip
            </h3>

            {/* Origin Section */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{
                    fontSize: '14px',
                    color: '#5f6368',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: hasOrigin ? '#34a853' : '#e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: 'white',
                        fontWeight: '600'
                    }}>
                        A
                    </span>
                    <span>Origin: {hasOrigin ? '✓ Set' : 'Not set'}</span>
                </div>
                {!hasOrigin && (
                    <button
                        onClick={onGetLocation}
                        style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#1a73e8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1557b0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a73e8'}
                    >
                        📍 Use My Location
                    </button>
                )}
            </div>

            {/* Destination Section */}
            <div style={{ marginBottom: '16px' }}>
                <div style={{
                    fontSize: '14px',
                    color: '#5f6368',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: hasDestination ? '#ea4335' : '#e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: 'white',
                        fontWeight: '600'
                    }}>
                        B
                    </span>
                    <span>Destination: {hasDestination ? '✓ Set' : 'Search above'}</span>
                </div>
            </div>

            {/* Get Routes Button */}
            <button
                onClick={onGetRoutes}
                disabled={!hasOrigin || !hasDestination}
                style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: hasOrigin && hasDestination ? '#34a853' : '#e0e0e0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    cursor: hasOrigin && hasDestination ? 'pointer' : 'not-allowed',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                    if (hasOrigin && hasDestination) {
                        e.currentTarget.style.backgroundColor = '#2d8e47';
                    }
                }}
                onMouseLeave={(e) => {
                    if (hasOrigin && hasDestination) {
                        e.currentTarget.style.backgroundColor = '#34a853';
                    }
                }}
            >
                🚌 Get Route Suggestions
            </button>

            {/* Instructions */}
            <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#5f6368',
                lineHeight: '1.5'
            }}>
                <strong>How to use:</strong>
                <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                    <li>Set your origin (use location button)</li>
                    <li>Search for destination in the search bar</li>
                    <li>Click "Get Route Suggestions"</li>
                </ol>
            </div>
        </div>
    );
};

export default RoutePlanningPanel;
