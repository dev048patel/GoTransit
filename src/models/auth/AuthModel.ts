/**
 * AuthModel.ts — GoTransit Regina
 *
 * Model layer for authentication (MVC).
 * Contains all shared types used by AuthService and the auth controllers.
 * Session management is handled entirely by Supabase Auth.
 */

/* ── Authenticated user (used by AuthContext) ────────────────────── */

export interface User {
    id: string;
    fullName: string;
    email: string;
    mobile?: string;
    role: 'user' | 'admin';
}

/* ── Login form data ─────────────────────────────────────────────── */

export interface LoginFormData {
    identifier: string;   // email or mobile number
    password: string;
}

/* ── Signup form data ────────────────────────────────────────────── */

export interface SignupFormData {
    fullName: string;
    email: string;
    password: string;
    mobile: string;       // optional — may be empty string
}

/* ── Password strength indicator ─────────────────────────────────── */

export interface PasswordStrength {
    score: number;        // 0–4
    label: string;        // e.g. "Weak", "Strong 💪"
    color: string;        // Tailwind bg class, e.g. "bg-green-500"
}

/* ── Result returned by AuthService.signUpUser() ─────────────────── */

export interface SignupResult {
    success: boolean;
    error?: string;
}
