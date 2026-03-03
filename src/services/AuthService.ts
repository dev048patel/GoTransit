/**
 * AuthService.ts — GoTransit Regina
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
import type {
    LoginFormData,
    SignupFormData,
    PasswordStrength,
    SignupResult,
} from '../models/auth/AuthModel';

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
 * Register a new user via Supabase Auth.
 * The database trigger `on_auth_user_created` auto-creates the profiles row.
 */
export async function signUpUser(data: SignupFormData): Promise<SignupResult> {
    const { error } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
            data: {
                full_name: data.fullName.trim(),
                mobile_number: data.mobile || null,
            },
        },
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
}
