
import React from 'react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: any;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    label?: string;
}

export default function ActionButton({ icon: Icon, variant = 'secondary', label, className, ...props }: ActionButtonProps) {
    const styles = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
        secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm',
        danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
        ghost: 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
    };

    return (
        <button
            className={`p-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${styles[variant]} ${className}`}
            {...props}
        >
            <Icon size={18} />
            {label && <span className="text-sm font-medium">{label}</span>}
        </button>
    );
}
