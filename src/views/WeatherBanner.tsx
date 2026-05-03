/**
 * WeatherBanner.tsx — GoTransit Regina
 *
 * Compact floating weather pill shown top-left on the map, just below the Navbar.
 */

import type { WeatherSnapshot } from '../models/services/WeatherService';

interface Props {
    weather: WeatherSnapshot | null;
}

type ConditionKey = 'extreme_cold' | 'smoky' | 'snowy' | 'rainy' | 'cold' | 'windy' | 'cloudy' | 'sunny';

function getConditionKey(w: WeatherSnapshot): ConditionKey {
    if (w.isExtremeCold) return 'extreme_cold';
    if (w.isSmoky)       return 'smoky';
    if (w.isSnowy)       return 'snowy';
    if (w.isRainy)       return 'rainy';
    if (w.isCold)        return 'cold';
    if (w.isWindy)       return 'windy';
    if (w.isCloudy)      return 'cloudy';
    return 'sunny';
}

interface Theme { bg: string; text: string; border: string; }

const CONDITION_LABEL: Record<ConditionKey, string> = {
    extreme_cold: 'Extreme Cold',
    cold:         'Cold',
    snowy:        'Snowy',
    rainy:        'Rainy',
    smoky:        'Smoky Air',
    windy:        'Windy',
    cloudy:       'Cloudy',
    sunny:        'Clear',
};

function getTheme(w: WeatherSnapshot): Theme {
    switch (getConditionKey(w)) {
        case 'extreme_cold': return { bg: '#0D47A1', text: '#fff',    border: 'transparent' };
        case 'cold':         return { bg: '#E3F2FD', text: '#0D47A1', border: '#90CAF9' };
        case 'snowy':        return { bg: '#E8EAF6', text: '#283593', border: '#9FA8DA' };
        case 'rainy':        return { bg: '#E1F5FE', text: '#01579B', border: '#81D4FA' };
        case 'smoky':        return { bg: '#FFF3E0', text: '#E65100', border: '#FFCC80' };
        case 'windy':        return { bg: '#F5F5F5', text: '#424242', border: '#E0E0E0' };
        case 'cloudy':       return { bg: '#F5F5F5', text: '#616161', border: '#E0E0E0' };
        case 'sunny': default: return { bg: '#FFFDE7', text: '#E65100', border: '#FFE082' };
    }
}

function WeatherIcon({ w }: { w: WeatherSnapshot }) {
    const key = getConditionKey(w);
    const color = getTheme(w).text;
    const s = { width: 14, height: 14 } as const;

    if (key === 'extreme_cold' || key === 'cold' || key === 'snowy') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="2" x2="12" y2="22" /><line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2L9 5M12 2L15 5M12 22L9 19M12 22L15 19M2 12L5 9M2 12L5 15M22 12L19 9M22 12L19 15" />
        </svg>
    );
    if (key === 'rainy') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
            <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
            <line x1="8" y1="19" x2="8" y2="21" /><line x1="16" y1="19" x2="16" y2="21" /><line x1="12" y1="21" x2="12" y2="23" />
        </svg>
    );
    if (key === 'smoky' || key === 'cloudy') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
    );
    if (key === 'windy') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
            <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
        </svg>
    );
    return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
    );
}

export default function WeatherBanner({ weather }: Props) {
    if (!weather) return null;

    const theme = getTheme(weather);
    const tempStr = weather.tempC !== null ? `${Math.round(weather.tempC)}°C` : '';
    const label = [CONDITION_LABEL[getConditionKey(weather)], tempStr].filter(Boolean).join(' · ');

    return (
        <div style={{
            position: 'fixed',
            top: '62px',
            left: '10px',
            zIndex: 1045,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: theme.bg,
            border: `1px solid ${theme.border}`,
            borderRadius: '20px',
            padding: '5px 12px 5px 8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            maxWidth: '220px',
            animation: 'weatherFadeIn 0.2s ease-out',
        }}>
            <WeatherIcon w={weather} />
            <span style={{
                fontSize: '12px',
                fontWeight: '600',
                color: theme.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '180px',
            }}>
                {label}
            </span>
            <style>{`
                @keyframes weatherFadeIn {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
