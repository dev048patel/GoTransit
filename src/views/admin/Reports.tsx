import React, { useState } from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import ActionButton from '../../components/admin/ActionButton';

export default function Reports() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Reports Generation</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Daily Report */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg w-fit mb-4">
                        <FileText size={24} />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Daily Traffic Report</h3>
                    <p className="text-sm text-gray-500 mb-4">Detailed analytics about today's API usage, searches, and active users.</p>
                    <button className="w-full py-2 bg-gray-900 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800">
                        <Download size={16} /> Download PDF
                    </button>
                </div>

                {/* Monthly Summary */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg w-fit mb-4">
                        <Calendar size={24} />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Monthly Summary</h3>
                    <p className="text-sm text-gray-500 mb-4">Aggregated data for the current month including cost analysis.</p>
                    <button className="w-full py-2 bg-gray-900 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800">
                        <Download size={16} /> Download PDF
                    </button>
                </div>

                {/* Cost Analysis */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg w-fit mb-4">
                        <FileText size={24} />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Cost Analysis</h3>
                    <p className="text-sm text-gray-500 mb-4">Detailed breakdown of Google Maps API costs and projections.</p>
                    <button className="w-full py-2 bg-gray-900 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800">
                        <Download size={16} /> Download Excel
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4">Custom Report Builder</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Date Range</label>
                        <div className="flex gap-2">
                            <input type="date" className="w-full p-2 border rounded-lg" />
                            <input type="date" className="w-full p-2 border rounded-lg" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Format</label>
                        <select className="w-full p-2 border rounded-lg">
                            <option>PDF</option>
                            <option>CSV</option>
                            <option>Excel</option>
                        </select>
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Generate Custom Report</button>
                </div>
            </div>
        </div>
    );
}
