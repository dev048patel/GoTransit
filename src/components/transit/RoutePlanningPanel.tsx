/**
 * RoutePlanningPanel
 * Control panel for setting origin, destination, and viewing route suggestions
 */

import React from 'react';
import {RoutePlanningPanelProps} from '../../models/transit/Planner';

export const RoutePlanningPanel: React.FC<RoutePlanningPanelProps> = ({
    hasOrigin,
    hasDestination,
    onGetLocation,
    onGetRoutes
}) => {
    return (
        <div className="absolute bottom-5 left-5 bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-5 min-w-[280px] z-[1000]">
            <h3 className="m-0 mb-4 text-base font-semibold text-[#202124]">
                Plan Your Trip
            </h3>

            {/* Origin Section */}
            <div className="mb-3">
                <div className="text-sm text-[#5f6368] mb-2 flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-semibold ${hasOrigin ? 'bg-[#34a853]' : 'bg-[#e0e0e0]'}`}>
                        A
                    </span>
                    <span>Origin: {hasOrigin ? '✓ Set' : 'Not set'}</span>
                </div>
                {!hasOrigin && (
                    <button
                        onClick={onGetLocation}
                        className="w-full p-2.5 bg-[#1a73e8] text-white border-none rounded-md text-sm cursor-pointer font-medium transition-colors duration-200 hover:bg-[#1557b0]"
                    >
                        📍 Use My Location
                    </button>
                )}
            </div>

            {/* Destination Section */}
            <div className="mb-4">
                <div className="text-sm text-[#5f6368] flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-semibold ${hasDestination ? 'bg-[#ea4335]' : 'bg-[#e0e0e0]'}`}>
                        B
                    </span>
                    <span>Destination: {hasDestination ? '✓ Set' : 'Search above'}</span>
                </div>
            </div>

            {/* Get Routes Button */}
            <button
                onClick={onGetRoutes}
                disabled={!hasOrigin || !hasDestination}
                className={`w-full p-3 text-white border-none rounded-lg text-[15px] font-semibold transition-colors duration-200 ${
                    hasOrigin && hasDestination
                        ? 'bg-[#34a853] cursor-pointer hover:bg-[#2d8e47]'
                        : 'bg-[#e0e0e0] cursor-not-allowed'
                }`}
            >
                🚌 Get Route Suggestions
            </button>

            {/* Instructions */}
            <div className="mt-4 p-3 bg-[#f8f9fa] rounded-md text-xs text-[#5f6368] leading-relaxed">
                <strong>How to use:</strong>
                <ol className="mt-2 mb-0 ml-0 pl-5">
                    <li>Set your origin (use location button)</li>
                    <li>Search for destination in the search bar</li>
                    <li>Click "Get Route Suggestions"</li>
                </ol>
            </div>
        </div>
    );
};

export default RoutePlanningPanel;
