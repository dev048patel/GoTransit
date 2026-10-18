/* Whether the rider has agreed to share their location with the map.

   The browser's own permission prompt only appears once the rider taps "Use my location", so
   location is asked for at the moment it is useful, with an explanation first. The choice is kept
   on this device only. */

export type LocationChoice = 'allowed' | 'declined' | null;

const KEY = 'transit-regina:location-choice';
const listeners = new Set<(choice: LocationChoice) => void>();

export function getLocationChoice(): LocationChoice {
    try {
        const value = localStorage.getItem(KEY);
        return value === 'allowed' || value === 'declined' ? value : null;
    } catch {
        return null;
    }
}

export function setLocationChoice(choice: Exclude<LocationChoice, null>): void {
    try { localStorage.setItem(KEY, choice); } catch { /* private mode: remember for this visit only */ }
    listeners.forEach(listener => listener(choice));
}

export function onLocationChoice(listener: (choice: LocationChoice) => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

/** True when the browser already has permission, so asking again would only add a step */
export async function browserAlreadyAllows(): Promise<boolean> {
    try {
        const status = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
        return status?.state === 'granted';
    } catch {
        return false;
    }
}
