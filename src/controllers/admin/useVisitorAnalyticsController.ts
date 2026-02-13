/*
  Controller for the Visitor Analytics admin page.
  Fetches visitor data and summary from the backend API.
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
    uniqueVisitors24h: number;
    activeNow: number;
    totalPageViews: number;
    browsers: { name: string; count: number }[];
    operatingSystems: { name: string; count: number }[];
    devices: { name: string; count: number }[];
    topPages: { path: string; count: number }[];
}

export function useVisitorAnalyticsController() {
    const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    const baseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [visitorsRes, summaryRes] = await Promise.all([
                fetch(`${baseUrl}/api/analytics/visitors`),
                fetch(`${baseUrl}/api/analytics/summary`)
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
    }, [baseUrl]);

    useEffect(() => {
        fetchData();
        // Auto-refresh every 30 seconds
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
    };
}
