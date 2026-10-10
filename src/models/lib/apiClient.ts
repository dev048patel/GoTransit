/**
 * apiClient.ts
 *
 * Thin wrapper around fetch that automatically attaches the current user's
 * Supabase JWT as a Bearer token. Every backend route protected by
 * requireAuth or requireAdmin must be called through this — never raw fetch.
 */

import { supabase } from './supabase';

const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

async function authHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
}

async function checkOk(res: Response): Promise<Response> {
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    return res;
}

export async function apiGet(path: string): Promise<Response> {
    return checkOk(await fetch(`${BASE_URL}${path}`, {
        method: 'GET',
        headers: await authHeaders(),
    }));
}

export async function apiPost(path: string, body?: unknown): Promise<Response> {
    return checkOk(await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: await authHeaders(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
    }));
}

export async function apiPatch(path: string, body?: unknown): Promise<Response> {
    return checkOk(await fetch(`${BASE_URL}${path}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
    }));
}

export async function apiDelete(path: string, body?: unknown): Promise<Response> {
    return checkOk(await fetch(`${BASE_URL}${path}`, {
        method: 'DELETE',
        headers: await authHeaders(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
    }));
}
