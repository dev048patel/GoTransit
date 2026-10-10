import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../models/context/AuthContext';
import { SavedDestination } from '../models/transit/SavedDestination';
import { SavedDestinationsService } from '../models/services/SavedDestinationsService';
import { TripOption } from '../models/transit/RoutePlanning';
import { RoutePlanningService } from '../models/services/RoutePlanningService';
import { WeeklyScheduleService } from '../models/services/WeeklyScheduleService';
import { PushSubscriptionService } from '../models/services/PushSubscriptionService';
import { DayPlan, WEEKDAY_INDICES, blankDay } from '../models/transit/WeeklySchedule';
import { computeDepartBy } from '../models/transit/TripSchedule';

const routePlanner = new RoutePlanningService();
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type DayState = DayPlan & {
    options: TripOption[];
    calculating: boolean;
    calcError: string;
};

function blankDayState(): DayState {
    return { ...blankDay(), options: [], calculating: false, calcError: '' };
}

function initDays(): Record<number, DayState> {
    const d: Record<number, DayState> = {};
    WEEKDAY_INDICES.forEach(i => { d[i] = blankDayState(); });
    return d;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export function useWeeklyPlannerController() {
    const { user, isAuthenticated } = useAuth();

    const [isOpen, setIsOpen] = useState(false);
    const [savedDests, setSavedDests] = useState<SavedDestination[]>([]);
    const [destsLoading, setDestsLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [days, setDays] = useState<Record<number, DayState>>(initDays);
    const [selectedDay, setSelectedDay] = useState<number>(
        WEEKDAY_INDICES.includes(new Date().getDay()) ? new Date().getDay() : 1
    );
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Push notification state
    const [notifPermission, setNotifPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
    const [subscribing, setSubscribing] = useState(false);

    useEffect(() => {
        setNotifPermission(
            'Notification' in window ? (Notification.permission as 'default' | 'granted' | 'denied') : 'unsupported'
        );
    }, []);

    // Load saved destinations + existing schedule when panel opens
    useEffect(() => {
        if (!isOpen || !user) return;
        let cancelled = false;
        setDestsLoading(true);
        setLoading(true);

        Promise.all([
            SavedDestinationsService.getAll(user.id),
            WeeklyScheduleService.getForUser(user.id),
        ])
            .then(([dests, schedule]) => {
                if (cancelled) return;
                setSavedDests(dests);
                const next = initDays();
                schedule.forEach(row => {
                    if (WEEKDAY_INDICES.includes(row.day_of_week)) {
                        next[row.day_of_week] = {
                            fromId: row.from_dest_id,
                            toId: row.to_dest_id,
                            arriveBy: row.arrive_by,
                            departBy: row.depart_by,
                            routeNum: row.route_num,
                            routeTotalMinutes: row.route_total_minutes,
                            enabled: row.enabled,
                            options: [],
                            calculating: false,
                            calcError: '',
                        };
                    }
                });
                setDays(next);
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) { setDestsLoading(false); setLoading(false); } });

        return () => { cancelled = true; };
    }, [isOpen, user?.id]);

    const updateDay = useCallback((dayIndex: number, patch: Partial<DayState>) => {
        setDays(prev => ({ ...prev, [dayIndex]: { ...prev[dayIndex], ...patch } }));
    }, []);

    const handleFindRoutes = useCallback(async (dayIndex: number) => {
        const day = days[dayIndex];
        if (!day.fromId || !day.toId) {
            updateDay(dayIndex, { calcError: 'Select both From and To locations first.' });
            return;
        }
        const from = savedDests.find(d => d.id === day.fromId);
        const to = savedDests.find(d => d.id === day.toId);
        if (!from || !to) return;

        updateDay(dayIndex, { calculating: true, calcError: '', options: [] });
        try {
            const results = await routePlanner.calculateTripOptions(
                { lat: from.lat, lng: from.lng },
                { lat: to.lat, lng: to.lng },
                undefined,
            );
            const first = results[0];
            updateDay(dayIndex, {
                options: results,
                calculating: false,
                routeNum: first?.segments[0]?.routeNum ?? null,
                routeTotalMinutes: first?.totalTime ?? null,
                departBy: first ? computeDepartBy(day.arriveBy, first.totalTime) : null,
            });
        } catch {
            updateDay(dayIndex, { calculating: false, calcError: 'Could not calculate routes. Please try again.' });
        }
    }, [days, savedDests, updateDay]);

    const handlePinRoute = useCallback((dayIndex: number, option: TripOption) => {
        updateDay(dayIndex, {
            routeNum: option.segments[0]?.routeNum ?? null,
            routeTotalMinutes: option.totalTime,
            departBy: computeDepartBy(days[dayIndex].arriveBy, option.totalTime),
        });
    }, [days, updateDay]);

    const handleApplyToAll = useCallback(() => {
        const src = days[selectedDay];
        setDays(prev => {
            const next = { ...prev };
            WEEKDAY_INDICES.forEach(d => {
                next[d] = {
                    ...next[d],
                    fromId: src.fromId,
                    toId: src.toId,
                    arriveBy: src.arriveBy,
                    departBy: src.departBy,
                    routeNum: src.routeNum,
                    routeTotalMinutes: src.routeTotalMinutes,
                    options: [],
                    calcError: '',
                };
            });
            return next;
        });
    }, [days, selectedDay]);

    const handleSave = useCallback(async () => {
        if (!user) return;
        setSaving(true);
        setSaveError('');
        setSaveSuccess(false);
        try {
            const payload = new Map<number, Parameters<typeof WeeklyScheduleService.saveAll>[1] extends Map<number, infer V> ? V : never>();
            WEEKDAY_INDICES.forEach(d => {
                const day = days[d];
                payload.set(d, {
                    fromDestId: day.fromId,
                    toDestId: day.toId,
                    arriveBy: day.arriveBy,
                    departBy: day.departBy,
                    routeNum: day.routeNum,
                    routeTotalMinutes: day.routeTotalMinutes,
                    enabled: day.enabled,
                });
            });
            await WeeklyScheduleService.saveAll(user.id, payload);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch {
            setSaveError('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    }, [user, days]);

    const handleEnableNotifications = useCallback(async () => {
        if (!user || !('Notification' in window) || !('serviceWorker' in navigator) || !VAPID_PUBLIC_KEY) return;
        setSubscribing(true);
        try {
            const permission = await Notification.requestPermission();
            setNotifPermission(permission as 'default' | 'granted' | 'denied');
            if (permission !== 'granted') return;

            const reg = await navigator.serviceWorker.ready;
            const existing = await reg.pushManager.getSubscription();
            const sub = existing ?? await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
            });
            const json = sub.toJSON() as PushSubJson;
            if (json.keys) await PushSubscriptionService.save(user.id, { endpoint: json.endpoint!, keys: json.keys as { p256dh: string; auth: string } });
        } catch (err) {
            console.error('[WeeklyPlanner] Push subscribe failed:', err);
        } finally {
            setSubscribing(false);
        }
    }, [user]);

    const handleOpen = useCallback(() => setIsOpen(true), []);
    const handleClose = useCallback(() => {
        setIsOpen(false);
        setSaveSuccess(false);
        setSaveError('');
    }, []);

    return {
        isOpen, isAuthenticated,
        savedDests, destsLoading, loading,
        days, selectedDay, setSelectedDay,
        updateDay, handleFindRoutes, handlePinRoute, handleApplyToAll,
        handleSave, saving, saveSuccess, saveError,
        notifPermission, subscribing, handleEnableNotifications,
        handleOpen, handleClose,
    };
}

interface PushSubJson {
    endpoint?: string;
    keys?: Record<string, string>;
}
