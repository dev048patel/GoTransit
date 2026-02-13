/*
  Controller for the Visitor Analytics admin page.
  Fetches visitor data and summary from the backend API.
  Supports date range filtering with preset buttons.
*/

import { useState, useEffect, useCallback } from 'react';

interface VisitorRecord {
    ip: string;
    fingerprint: string;
    browser: string;
    os: string;
    device: string;
    firstSeen: string;
    lastSeen: string;
    pageViews: number;
    pagesVisited: string[];
}

interface AnalyticsSummary {
    totalVisitors: number;
    visitorsInRange: number;
    activeNow: number;
    totalPageViews: number;
    browsers: { name: string; count: number }[];
    operatingSystems: { name: string; count: number }[];
    devices: { name: string; count: number }[];
    topPages: { path: string; count: number }[];
}

export type DatePreset = 'today' | '7days' | '30days' | 'all';

function getPresetDates(preset: DatePreset): { from: string; to: string } | null {
    const now = new Date();
    const toDate = now.toISOString().split('T')[0]; // Today YYYY-MM-DD

    switch (preset) {
        case 'today':
            return { from: toDate, to: toDate };
        case '7days': {
            const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return { from: from.toISOString().split('T')[0], to: toDate };
        }
        case '30days': {
            const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return { from: from.toISOString().split('T')[0], to: toDate };
        }
        case 'all':
            return null; // No filter
    }
}

export function useVisitorAnalyticsController() {
    const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    // Date range state
    const [activePreset, setActivePreset] = useState<DatePreset>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const baseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Build query string from date range
            const params = new URLSearchParams();
            if (dateFrom) params.set('from', dateFrom);
            if (dateTo) params.set('to', dateTo);
            const qs = params.toString() ? `?${params.toString()}` : '';

            const [visitorsRes, summaryRes] = await Promise.all([
                fetch(`${baseUrl}/api/analytics/visitors${qs}`),
                fetch(`${baseUrl}/api/analytics/summary${qs}`)
            ]);

            if (!visitorsRes.ok || !summaryRes.ok) {
                throw new Error('Failed to fetch analytics data');
            }

            const visitorsData = await visitorsRes.json();
            const summaryData = await summaryRes.json();

            setVisitors(visitorsData);
            setSummary(summaryData);
            setLastRefreshed(new Date());
            setError(null);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError('Failed to load analytics data. Is the backend running?');
        } finally {
            setLoading(false);
        }
    }, [baseUrl, dateFrom, dateTo]);

    // Apply a preset and update the date inputs
    const applyPreset = useCallback((preset: DatePreset) => {
        setActivePreset(preset);
        const dates = getPresetDates(preset);
        if (dates) {
            setDateFrom(dates.from);
            setDateTo(dates.to);
        } else {
            setDateFrom('');
            setDateTo('');
        }
    }, []);

    // Set custom dates (clears preset highlight)
    const setCustomRange = useCallback((from: string, to: string) => {
        setActivePreset('all'); // No preset active when custom
        setDateFrom(from);
        setDateTo(to);
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return {
        visitors,
        summary,
        loading,
        error,
        lastRefreshed,
        refresh: fetchData,
        // Date filtering
        activePreset,
        dateFrom,
        dateTo,
        applyPreset,
        setCustomRange,
    };
}
