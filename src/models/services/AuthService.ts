/**
 * AuthService.ts — Transit Regina
 *
 * Service layer for authentication (MVC).
 * Pure functions — no React, no hooks.
 *
 * Responsibilities:
 *   - Validate login & signup form data
 *   - Calculate password strength
 *   - Format mobile numbers
 *   - Call Supabase signUp (signup only — login goes through AuthContext)
 */

import { supabase } from '../lib/supabase';
import { apiDelete, apiPost } from '../lib/apiClient';
import { SITE } from '../data/legal';
import type {
    LoginFormData,
    SignupFormData,
    PasswordStrength,
    SignupResult,
} from '../auth/AuthModel';

/* ── Validation helpers (private) ────────────────────────────────── */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^\+1 \d{3}-\d{3}-\d{4}$/;

/* ── Public API ──────────────────────────────────────────────────── */

/**
 * Returns true when the input looks like a phone number (starts with + or digit).
 */
export function isMobileNumber(input: string): boolean {
    return /^\+?\d/.test(input.trim());
}

/**
 * Validate login form fields.
 * Returns an empty object when everything is valid.
 */
export function validateLogin(data: LoginFormData): Record<string, string> {
    const errs: Record<string, string> = {};

    if (!data.identifier.trim()) {
        errs.identifier = 'Enter your email or mobile number';
    } else if (!isMobileNumber(data.identifier) && !EMAIL_REGEX.test(data.identifier)) {
        errs.identifier = 'Enter a valid email address';
    }

    if (data.password.length < 6) {
        errs.password = 'Password must be at least 6 characters';
    }

    return errs;
}

/**
 * Validate signup form fields.
 * Returns an empty object when everything is valid.
 */
export function validateSignup(data: SignupFormData): Record<string, string> {
    const errs: Record<string, string> = {};

    if (!data.fullName.trim()) errs.fullName = 'Full name is required';
    if (!EMAIL_REGEX.test(data.email)) errs.email = 'Enter a valid email address';
    if (data.password.length < 8) errs.password = 'Minimum 8 characters required';

    // Mobile is optional — only validate when provided
    if (data.mobile && !MOBILE_REGEX.test(data.mobile)) {
        errs.mobile = 'Enter a valid Canadian number (+1 XXX-XXX-XXXX)';
    }

    if (!data.agreedToTerms) errs.terms = 'Please agree to the Terms of Use and Privacy Policy to create an account';

    return errs;
}

/**
 * Score a password's strength (0–4).
 * Each criterion met adds one point: length ≥ 8, uppercase, digit, special char.
 */
export function getPasswordStrength(pw: string): PasswordStrength {
    let s = 0;
    if (pw.length >= 8) s++;  // length ≥ 8
    if (/[A-Z]/.test(pw)) s++;  // uppercase letter
    if (/[0-9]/.test(pw)) s++;  // digit
    if (/[^A-Za-z0-9]/.test(pw)) s++;  // special character

    const map: Omit<PasswordStrength, 'score'>[] = [
        { label: 'Too short', color: 'bg-gray-200' },
        { label: 'Weak', color: 'bg-red-400' },
        { label: 'Fair', color: 'bg-yellow-400' },
        { label: 'Good', color: 'bg-blue-400' },
        { label: 'Strong 💪', color: 'bg-green-500' },
    ];

    return { score: s, ...map[s] };
}

/**
 * Format a raw string into a Canadian phone number: +1 XXX-XXX-XXXX.
 * Strips non-digits, caps at 11 digits (country code + 10).
 */
export function formatMobile(raw: string): string {
    const d = raw.replace(/\D/g, '').slice(0, 11);

    if (!d) return '';
    if (d.length <= 1) return `+${d}`;
    if (d.length <= 4) return `+${d[0]} ${d.slice(1)}`;
    if (d.length <= 7) return `+${d[0]} ${d.slice(1, 4)}-${d.slice(4)}`;
    return `+${d[0]} ${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
}

/**
 * Email a password-reset link. The link signs the user in and lands on /reset-password.
 * Returns null on success, or an error message string on failure.
 * Supabase reports success for unknown emails too (prevents email enumeration).
 */
export async function requestPasswordReset(email: string): Promise<string | null> {
    if (!EMAIL_REGEX.test(email.trim())) return 'Enter a valid email address';
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
    });
    return error ? error.message : null;
}

/**
 * Register a new user via Supabase Auth.
 * The database trigger `on_auth_user_created` auto-creates the profiles row.
 */
export async function signUpUser(data: SignupFormData): Promise<SignupResult> {
    const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
            data: {
                full_name: data.fullName.trim(),
                mobile_number: data.mobile || null,
                /* Record of what they agreed to, and when */
                terms_version: SITE.TERMS_VERSION,
                terms_accepted_at: new Date().toISOString(),
            },
        },
    });

    if (error) return { success: false, error: error.message };

    // Supabase returns a fake success with empty identities when the email
    // already exists (to prevent email enumeration). Detect and block it.
    if (signUpData?.user?.identities?.length === 0) {
        return { success: false, error: 'An account with this email already exists. Please log in instead.' };
    }

    return { success: true };
}

/** Permanently deletes the signed-in account and everything stored about it, after re-checking the password. Returns an error message, or null. */
export async function deleteAccount(password: string): Promise<string | null> {
    try {
        await apiDelete('/api/auth/account', { password });
        return null;
    } catch (err) {
        if ((err as { status?: number }).status === 401) return 'That password is not right.';
        return err instanceof Error ? err.message : 'Your account could not be deleted. Please try again.';
    }
}

/**
 * Changes the password: re-checks the current one on the server, sets the new one, then signs out
 * every other device, so anyone using an old session is locked out. Returns an error message, or null.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<string | null> {
    try {
        await apiPost('/api/auth/confirm-password', { password: currentPassword });
    } catch (err) {
        return (err as { status?: number }).status === 401 ? 'Your current password is not right.' : 'Please try again in a moment.';
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return error.message;
    await signOutOtherDevices();
    return null;
}

/** Ends every session except this one (other browsers, phones, old logins) */
export async function signOutOtherDevices(): Promise<void> {
    await supabase.auth.signOut({ scope: 'others' });
}

/** Records, through the server, that the signed-in account agrees to the current Terms and Privacy policy. Returns an error message, or null. */
export async function acceptTerms(): Promise<string | null> {
    try {
        await apiPost('/api/auth/accept-terms');
        await supabase.auth.refreshSession();   // picks up the copy on the sign-in record
        return null;
    } catch {
        return 'Your agreement could not be saved. Please try again.';
    }
}

/**
 * Which Terms version this account has agreed to. Reads the server-written profile column; if
 * that column is not set up yet, falls back to the copy on the sign-in record.
 */
export async function fetchAgreedTermsVersion(userId: string): Promise<string | null> {
    const { data, error } = await supabase.from('profiles').select('terms_version').eq('id', userId).single();
    if (error?.code === '42703') {
        /* Columns not set up yet: read the copy on the sign-in record, fresh from the server */
        const { data: fresh } = await supabase.auth.getUser();
        return fresh.user?.user_metadata?.terms_version ?? null;
    }
    if (error) return null;
    return data?.terms_version ?? null;
}
