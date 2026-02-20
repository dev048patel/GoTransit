/**
 * useSignupController.ts — GoTransit Regina
 *
 * Controller layer for the Signup page (MVC).
 * - Owns all form state: fullName, email, password, mobile, errors, loading, success
 * - Validates fields and calculates password strength
 * - On success: sets success=true so the View shows the success screen
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { registerUser } from '../../services/UserRegistry';
import { saveCredential } from '../../models/auth/AuthModel';

/* ── Password strength ─────────────────────────────────────────── */
export interface PasswordStrength {
    score: number;
    label: string;
    color: string;
}

export function getStrength(pw: string): PasswordStrength {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    const map: Omit<PasswordStrength, 'score'>[] = [
        { label: 'Too short', color: 'bg-gray-200' },
        { label: 'Weak', color: 'bg-red-400' },
        { label: 'Fair', color: 'bg-yellow-400' },
        { label: 'Good', color: 'bg-blue-400' },
        { label: 'Strong 💪', color: 'bg-green-500' },
    ];
    return { score: s, ...map[s] };
}

/* ── Phone formatter ────────────────────────────────────────────── */
export function formatMobile(raw: string): string {
    const d = raw.replace(/\D/g, '').slice(0, 11);
    if (!d) return '';
    if (d.length <= 1) return `+${d}`;
    if (d.length <= 4) return `+${d[0]} ${d.slice(1)}`;
    if (d.length <= 7) return `+${d[0]} ${d.slice(1, 4)}-${d.slice(4)}`;
    return `+${d[0]} ${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
}

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isValidMobile = (v: string) => !v || /^\+1 \d{3}-\d{3}-\d{4}$/.test(v);

/* ── Controller output type ─────────────────────────────────────── */
interface SignupControllerOutput {
    fullName: string; setFullName: (v: string) => void;
    email: string; setEmail: (v: string) => void;
    password: string; setPassword: (v: string) => void;
    showPw: boolean; toggleShowPw: () => void;
    mobile: string; setMobile: (v: string) => void;
    errors: Record<string, string>;
    isLoading: boolean;
    success: boolean;
    strength: PasswordStrength;
    handleMobileChange: (raw: string) => void;
    handleSubmit: (e: React.FormEvent) => void;
}

/* ── Controller ─────────────────────────────────────────────────── */
export function useSignupController(): SignupControllerOutput {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [mobile, setMobile] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const strength = getStrength(password);

    const toggleShowPw = useCallback(() => setShowPw(v => !v), []);

    const handleMobileChange = useCallback((raw: string) => {
        setMobile(formatMobile(raw));
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const errs: Record<string, string> = {};
        if (!fullName.trim()) errs.fullName = 'Full name is required';
        if (!isValidEmail(email)) errs.email = 'Enter a valid email address';
        if (password.length < 8) errs.password = 'Minimum 8 characters required';
        if (!isValidMobile(mobile)) errs.mobile = 'Enter a valid Canadian number (+1 XXX-XXX-XXXX)';
        setErrors(errs);
        if (Object.keys(errs).length) return;

        setIsLoading(true);
        // TODO: wire to backend API
        await new Promise(resolve => setTimeout(resolve, 1100));
        setIsLoading(false);

        // Save credential hash so login can validate the password
        saveCredential(email, password);
        // Persist to UserRegistry → saves to PostgreSQL + localStorage cache
        await registerUser(fullName, email, mobile || undefined);

        // Auto-login so the session is immediately populated (profile shows real name)
        await login(email, password, fullName);

        setSuccess(true);
        // Redirect to map after a brief success flash
        setTimeout(() => navigate('/map'), 1500);
    }, [fullName, email, password, mobile, login, navigate]);

    return {
        fullName, setFullName,
        email, setEmail,
        password, setPassword,
        showPw, toggleShowPw,
        mobile, setMobile,
        errors, isLoading, success,
        strength,
        handleMobileChange,
        handleSubmit,
    };
}
