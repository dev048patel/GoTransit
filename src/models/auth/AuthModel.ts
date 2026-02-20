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

/* ── Password credential store ───────────────────────────────────
   Stores a simple hash of each user's password keyed by email.
   This is client-side only — suitable for this demo app.
   Never store real passwords like this in production; use a backend.
 ─────────────────────────────────────────────────────────────── */
const CRED_KEY = 'gotransit_creds';

/** djb2 hash — fast, deterministic, good enough for demo validation */
function hashPassword(pw: string): string {
    let h = 5381;
    for (let i = 0; i < pw.length; i++) h = ((h << 5) + h) ^ pw.charCodeAt(i);
    return (h >>> 0).toString(36);
}

type CredStore = Record<string, string>; // email → hashed password

function loadCreds(): CredStore {
    try { return JSON.parse(localStorage.getItem(CRED_KEY) || '{}'); } catch { return {}; }
}

/** Save a password for a new account */
export function saveCredential(email: string, password: string): void {
    const creds = loadCreds();
    creds[email.toLowerCase()] = hashPassword(password);
    localStorage.setItem(CRED_KEY, JSON.stringify(creds));
}

/** Returns true if the password matches what was stored at signup */
export function validateCredential(email: string, password: string): boolean {
    const creds = loadCreds();
    const stored = creds[email.toLowerCase()];
    if (!stored) return false; // no account found
    return stored === hashPassword(password);
}
