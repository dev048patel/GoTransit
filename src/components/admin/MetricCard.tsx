import React from 'react';

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: any;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: string;
    subtext?: string;
}

export default function MetricCard({ title, value, icon: Icon, trend, color = "blue", subtext }: MetricCardProps) {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-green-50 text-green-600",
        yellow: "bg-yellow-50 text-yellow-600",
        red: "bg-red-50 text-red-600",
        purple: "bg-purple-50 text-purple-600",
    }[color] || "bg-blue-50 text-blue-600";

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>

                    {subtext && (
                        <p className="text-xs text-gray-400 mt-1">{subtext}</p>
                    )}

                    {trend && (
                        <div className={`flex items-center mt-2 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
                            <span className="text-gray-400 ml-2">vs last month</span>
                        </div>
                    )}
                </div>

                <div className={`p-3 rounded-lg ${colorClasses}`}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );
}
