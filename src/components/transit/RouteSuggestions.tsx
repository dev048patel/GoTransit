/**
 * RouteSuggestions Component
 * Displays up to 3 route suggestions from origin to destination
 */

import React from 'react';

import { RouteSuggestionsProps } from '../../models/transit/RouteSuggestion';

export const RouteSuggestions: React.FC<RouteSuggestionsProps> = ({ options, onSelectRoute, onClose }) => {
    if (options.length === 0) {
        return (
            <div className="absolute top-20 right-5 w-[380px] bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.15)] p-6 z-[1000]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="m-0 text-lg font-semibold">Route Suggestions</h3>
                    <button
                        onClick={onClose}
                        className="border-none bg-transparent text-2xl cursor-pointer p-1 text-[#5f6368]"
                    >×</button>
                </div>
                <p className="text-center text-[#5f6368] py-10">
                    No routes found. Try locations closer to transit stops.
                </p>
            </div>
        );
    }

    return (
        <div className="absolute top-20 right-5 w-[400px] max-h-[calc(100vh-120px)] bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.15)] z-[1000] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-[#e0e0e0]">
                <h3 className="m-0 text-lg font-semibold">Route Suggestions</h3>
                <button
                    onClick={onClose}
                    className="border-none bg-transparent text-2xl cursor-pointer p-1 text-[#5f6368]"
                >×</button>
            </div>

            {/* Route Options */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {options.map((option, index) => (
                    <div
                        key={index}
                        onClick={() => onSelectRoute(option)}
                        className="bg-[#f8f9fa] rounded-lg p-4 mb-3 cursor-pointer border-2 border-transparent transition-all duration-200 hover:bg-[#e8f0fe] hover:border-[#1a73e8]"
                    >
                        {/* Route Header */}
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex gap-2 items-center">
                                {option.segments.map((seg, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-[#1a73e8] text-white px-3 py-1 rounded-2xl text-sm font-semibold"
                                    >
                                        Route {seg.routeNum}
                                    </div>
                                ))}
                            </div>
                            <div className="text-base font-semibold text-[#202124]">
                                {option.totalTime} min
                            </div>
                        </div>

                        {/* Route Details */}
                        <div className="text-sm text-[#5f6368] leading-relaxed">
                            {option.segments.map((seg, idx) => (
                                <div key={idx} className="mb-2">
                                    <div className="font-medium text-[#202124]">
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
                        <div className="flex gap-4 mt-3 pt-3 border-t border-[#e0e0e0] text-[13px] text-[#5f6368]">
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
