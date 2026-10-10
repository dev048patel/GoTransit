import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../models/context/AuthContext';
import { WeeklyScheduleService } from '../models/services/WeeklyScheduleService';
import { DbWeeklySchedule } from '../models/transit/WeeklySchedule';

function minutesUntil(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    const now = new Date();
    return (h * 60 + m) - (now.getHours() * 60 + now.getMinutes());
}

function dismissKey(schedule: DbWeeklySchedule): string {
    const today = new Date().toISOString().slice(0, 10);
    return `reminder_dismissed_${today}_${schedule.depart_by}`;
}

export default function DepartureReminderBanner() {
    const { user, isAuthenticated } = useAuth();
    const [schedule, setSchedule] = useState<DbWeeklySchedule | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [minsLeft, setMinsLeft] = useState<number>(0);

    // Load today's schedule once on mount
    useEffect(() => {
        if (!isAuthenticated || !user) return;
        WeeklyScheduleService.getTodayForUser(user.id)
            .then(s => {
                if (!s || !s.depart_by) return;
                // Check not already dismissed this session
                if (sessionStorage.getItem(dismissKey(s))) return;
                setSchedule(s);
                setMinsLeft(minutesUntil(s.depart_by));
            })
            .catch(() => {});
    }, [isAuthenticated, user?.id]);

    // Tick every 60 seconds to update countdown and auto-hide when window passes
    useEffect(() => {
        if (!schedule?.depart_by) return;
        const id = setInterval(() => {
            const mins = minutesUntil(schedule.depart_by!);
            setMinsLeft(mins);
            if (mins < -5) setSchedule(null); // departure passed — hide
        }, 60_000);
        return () => clearInterval(id);
    }, [schedule?.depart_by]);

    const handleDismiss = useCallback(() => {
        if (schedule) sessionStorage.setItem(dismissKey(schedule), '1');
        setDismissed(true);
    }, [schedule]);

    // Show only within the window: 30 min before → 5 min after departure
    if (!schedule || !schedule.depart_by || dismissed) return null;
    if (minsLeft > 30 || minsLeft < -5) return null;

    const urgent = minsLeft <= 8;
    const bg = urgent ? '#2E7D32' : '#F1F8F2';
    const textColor = urgent ? 'white' : '#1B5E20';
    const subColor = urgent ? 'rgba(255,255,255,0.8)' : '#4CAF50';
    const borderColor = urgent ? 'transparent' : '#A5D6A7';

    return (
        <div style={{
            position: 'fixed', top: '52px', left: 0, right: 0,
            zIndex: 1050,
            backgroundColor: bg,
            borderBottom: `1px solid ${borderColor}`,
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: '10px',
            animation: 'slideDown 0.25s ease-out',
            boxShadow: urgent ? '0 2px 12px rgba(46,125,50,0.3)' : '0 1px 6px rgba(0,0,0,0.08)',
        }}>
            {/* Icon */}
            <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: urgent ? 'rgba(255,255,255,0.15)' : '#E8F5E9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={urgent ? 'white' : '#2E7D32'} strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
            </div>

            {/* Message */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: textColor, lineHeight: 1.2 }}>
                    {minsLeft <= 0
                        ? 'Time to leave now!'
                        : minsLeft === 1
                            ? 'Leave in 1 minute!'
                            : `Leave in ${minsLeft} min`}
                    {schedule.route_num && (
                        <span style={{ fontWeight: '400', marginLeft: '4px' }}>
                            · Bus {schedule.route_num}
                        </span>
                    )}
                </div>
                <div style={{ fontSize: '11px', color: subColor, marginTop: '1px' }}>
                    Depart by {schedule.depart_by}
                    {schedule.arrive_by && ` · arrive by ${schedule.arrive_by}`}
                </div>
            </div>

            {/* Dismiss */}
            <button
                onClick={handleDismiss}
                style={{
                    width: '26px', height: '26px', borderRadius: '50%', border: 'none', flexShrink: 0,
                    backgroundColor: urgent ? 'rgba(255,255,255,0.2)' : '#E8F5E9',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: urgent ? 'white' : '#2E7D32', transition: 'background-color 0.15s',
                }}
                aria-label="Dismiss reminder"
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>

            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-100%); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
