/* What the visitor has done on a portfolio bus, remembered in this browser only, so coming back to
   the page keeps their progress: who they have met, which questions they asked, and which
   achievements they earned. Storage can be unavailable (private windows, blocked site data); then
   progress simply lasts for the visit. */
import { useCallback, useState } from 'react';

type Kind = 'met' | 'asked' | 'badges';
const keyFor = (slug: string, kind: Kind) => `ride-${kind}:${slug}`;

function load(slug: string, kind: Kind): Set<string> {
    try {
        const raw = localStorage.getItem(keyFor(slug, kind));
        const parsed = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []);
    } catch {
        return new Set();
    }
}

function useStoredSet(slug: string, kind: Kind) {
    const [set, setSet] = useState<Set<string>>(() => load(slug, kind));
    const add = useCallback((id: string) => {
        setSet(prev => {
            if (prev.has(id)) return prev;
            const next = new Set(prev).add(id);
            try { localStorage.setItem(keyFor(slug, kind), JSON.stringify([...next])); } catch { /* progress just isn't kept */ }
            return next;
        });
    }, [slug, kind]);
    return [set, add] as const;
}

export function useRideDiscoveries(slug: string) {
    const [met, meet] = useStoredSet(slug, 'met');
    const [asked, ask] = useStoredSet(slug, 'asked');
    const [badges, earn] = useStoredSet(slug, 'badges');
    return { met, meet, asked, ask, badges, earn };
}
