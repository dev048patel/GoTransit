/**
 * AuthModel.ts — GoTransit Regina
 *
 * Defines the shape of the authenticated user and the session stored in localStorage.
 * This is the Model layer for the auth feature (MVC).
 */

export interface User {
    fullName: string;
    email: string;
    mobile?: string;
}

export interface AuthSession {
    user: User;
    token: string;          // Opaque token (will be a real JWT once backend is connected)
    expiresAt: number;      // Unix ms timestamp
}

/** Key used to persist the session in localStorage */
export const SESSION_STORAGE_KEY = 'gotransit_session';

/** How long (ms) a mock session lives before expiring — 7 days */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Reads and validates a stored session from localStorage. Returns null if absent/expired. */
export function loadSession(): AuthSession | null {
    try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;
        const session: AuthSession = JSON.parse(raw);
        if (Date.now() > session.expiresAt) {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

/** Persists a session to localStorage. */
export function saveSession(session: AuthSession): void {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

/** Removes the stored session from localStorage. */
export function clearSession(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
}
