/**
 * UserRegistry.ts — GoTransit Regina
 *
 * A lightweight client-side user store backed by localStorage.
 * This allows signup/login events to be tracked and surfaced in the Admin panel
 * — even without a backend — by persisting an array of RegisteredUser records.
 *
 * Key: 'gotransit_users'
 *
 * How it works:
 *  - SignupPage calls registerUser() → saves to PostgreSQL via /api/users/upsert
 *  - LoginPage calls recordLogin()   → updates last_login via /api/users/login
 *  - localStorage is kept as a local cache / offline fallback
 *  - Admin's UserManager reads getAllUsers() → now reads from the real API
 *  - terminal CLI (scripts/users.mjs) queries the same API directly
 */

import type { User } from '../models/admin/AdminTypes';

const REGISTRY_KEY = 'gotransit_users';

/* ── Base type stored in localStorage ──────────────────────────── */
export interface RegisteredUser {
    id: string;
    fullName: string;
    email: string;
    mobile?: string;
    registeredAt: string;   // ISO string
    lastLoginAt: string;    // ISO string
    loginCount: number;
    status: 'Active' | 'Suspended';
}

/** Base URL of the Express backend (Railway in prod, localhost in dev) */
const API_BASE = import.meta.env.VITE_SERVER_URL
    ? `https://${import.meta.env.VITE_SERVER_URL}/api/users`
    : 'http://localhost:3001/api/users';

/* ── Helpers ────────────────────────────────────────────────────── */

function load(): RegisteredUser[] {
    try {
        const raw = localStorage.getItem(REGISTRY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function save(users: RegisteredUser[]): void {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(users)); // local cache
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-CA', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

/* ── Public API ─────────────────────────────────────────────────── */

/**
 * Called when a new user signs up.
 * Skips if the email already exists (idempotent).
 */
export async function registerUser(fullName: string, email: string, mobile?: string): Promise<RegisteredUser> {
    const now = new Date().toISOString();
    let id = `usr-${Date.now()}`; // fallback if API unreachable

    // ── Persist to PostgreSQL via Express API ──
    try {
        const res = await fetch(`${API_BASE}/upsert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Do NOT send id — let Postgres generate the UUID
            body: JSON.stringify({ full_name: fullName, email, mobile_number: mobile || null }),
        });
        if (res.ok) {
            const data = await res.json() as { id?: string };
            if (data.id) id = data.id; // use DB-assigned UUID
        } else {
            const errText = await res.text();
            console.warn('[GoTransit] upsert failed:', res.status, errText);
        }
    } catch (e) {
        console.warn('[GoTransit] API unreachable — saved to localStorage only', e);
    }

    const newUser: RegisteredUser = {
        id, fullName, email, mobile,
        registeredAt: now, lastLoginAt: now, loginCount: 0, status: 'Active',
    };

    // ── Update local cache ──
    const users = load();
    if (!users.find(u => u.email === email)) {
        users.unshift(newUser);
        save(users);
    }

    console.log(
        '%c[GoTransit] ✅ NEW SIGNUP',
        'background:#003DA5;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold',
        { id, name: fullName, email, mobile: mobile || '—', registeredAt: formatDate(now) }
    );

    return newUser;
}

/**
 * Called every time a user logs in.
 * Creates a placeholder record if the user isn't in the registry yet
 * (handles the case where login happens without a prior signup — e.g. dev testing).
 */
export async function recordLogin(email: string, fullName: string): Promise<void> {
    // ── Persist login to PostgreSQL ──
    try {
        await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
    } catch {
        console.warn('[GoTransit] API unreachable — login not persisted to DB');
    }

    // ── Update local cache ──
    const users = load();
    const idx = users.findIndex(u => u.email === email);
    const now = new Date().toISOString();
    if (idx !== -1) {
        users[idx].lastLoginAt = now;
        users[idx].loginCount += 1;
    } else {
        users.unshift({
            id: `usr-${Date.now()}`,
            fullName, email,
            registeredAt: now, lastLoginAt: now, loginCount: 1, status: 'Active',
        });
    }
    save(users);

    console.log(
        '%c[GoTransit] 🔑 LOGIN',
        'background:#10B981;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold',
        { email, name: fullName, at: formatDate(now) }
    );
}

/**
 * Called on logout.
 */
export function recordLogout(email: string): void {
    console.log(
        '%c[GoTransit] 🚪 LOGOUT',
        'background:#6B7280;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold',
        { email, at: new Date().toLocaleTimeString() }
    );
}

/**
 * Returns all real registered users from the API (falls back to localStorage cache).
 * Mapped to the AdminTypes.User shape for the admin DataTable.
 */
export async function getAllUsers(): Promise<User[]> {
    try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = await res.json() as Array<{
            id: string; full_name: string; email: string;
            created_at: string; last_login_at: string | null; account_status: string;
        }>;
        return rows.map(u => ({
            id: u.id,
            name: u.full_name,
            email: u.email,
            role: 'Traveler',
            status: u.account_status === 'active' ? 'Active' : 'Suspended',
            registered: formatDate(u.created_at),
            last_login: u.last_login_at ? formatDate(u.last_login_at) : '—',
        }));
    } catch {
        // Offline fallback — use localStorage cache
        return load().map(u => ({
            id: u.id, name: u.fullName, email: u.email,
            role: 'Traveler', status: u.status,
            registered: formatDate(u.registeredAt),
            last_login: formatDate(u.lastLoginAt),
        }));
    }
}

/** Total user count from API (falls back to local cache count). */
export async function getRealUserCount(): Promise<number> {
    try {
        const res = await fetch(`${API_BASE}/count`);
        if (!res.ok) throw new Error();
        const { count } = await res.json() as { count: number };
        return count;
    } catch {
        return load().length;
    }
}

/** Wipe the registry — useful for dev/testing from the browser console. */
export function clearAllUsers(): void {
    localStorage.removeItem(REGISTRY_KEY);
    console.log('%c[GoTransit] 🗑️  User registry cleared', 'color:#EF4444;font-weight:bold');
}
