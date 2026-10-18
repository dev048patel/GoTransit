/* Who the visitor has already met on a portfolio bus, remembered in this browser only, so coming
   back to the page keeps their progress. Storage can be unavailable (private windows, blocked site
   data); then progress simply lasts for the visit. */
import { useCallback, useState } from 'react';

const keyFor = (slug: string) => `ride-met:${slug}`;

function load(slug: string): string[] {
    try {
        const raw = localStorage.getItem(keyFor(slug));
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

export function useRideDiscoveries(slug: string) {
    const [met, setMet] = useState<Set<string>>(() => new Set(load(slug)));

    const meet = useCallback((id: string) => {
        setMet(prev => {
            if (prev.has(id)) return prev;
            const next = new Set(prev).add(id);
            try { localStorage.setItem(keyFor(slug), JSON.stringify([...next])); } catch { /* progress just isn't kept */ }
            return next;
        });
    }, [slug]);

    const reset = useCallback(() => {
        setMet(new Set());
        try { localStorage.removeItem(keyFor(slug)); } catch { /* nothing stored */ }
    }, [slug]);

    return { met, meet, reset };
}
