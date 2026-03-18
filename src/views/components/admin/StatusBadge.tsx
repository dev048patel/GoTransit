/* Reusable status badge component — renders a colored pill label for active, inactive, pending, etc. */
import React from 'react';

type StatusType = 'active' | 'inactive' | 'pending' | 'warning' | 'error' | 'success';

interface StatusBadgeProps {
    status: string;
    type?: StatusType;
}

export default function StatusBadge({ status, type }: StatusBadgeProps) {
    const getType = (s: string): StatusType => {
        const lower = s.toLowerCase();
        if (lower.includes('active') || lower.includes('published') || lower.includes('delivered')) return 'success';
        if (lower.includes('inactive') || lower.includes('hidden') || lower.includes('suspended')) return 'inactive';
        if (lower.includes('pending') || lower.includes('scheduled')) return 'pending';
        if (lower.includes('failed') || lower.includes('error') || lower.includes('suspended')) return 'error';
        return 'active';
    };

    const finalType = type || getType(status);

    const styles = {
        success: 'bg-green-100 text-green-800 border-green-200',
        active: 'bg-blue-100 text-blue-800 border-blue-200',
        inactive: 'bg-gray-100 text-gray-800 border-gray-200',
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        warning: 'bg-orange-100 text-orange-800 border-orange-200',
        error: 'bg-red-100 text-red-800 border-red-200',
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[finalType]}`}>
            {status}
        </span>
    );
}
