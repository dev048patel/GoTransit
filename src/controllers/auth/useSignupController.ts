/**
 * useSignupController.ts — GoTransit Regina
 *
 * Controller layer for the Signup page (MVC).
 * - Owns all form state: fullName, email, password, mobile, errors, loading, success
 * - Delegates validation, password strength, phone formatting, and signUp to AuthService
 * - PasswordStrength type lives in the Model layer (AuthModel.ts)
 */

import { useState, useCallback } from 'react';
import type { PasswordStrength } from '../../models/auth/AuthModel';
import {
    validateSignup,
    getPasswordStrength,
    formatMobile,
    signUpUser,
} from '../../services/AuthService';

// Controller output type
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

// Controller -> Calling Service (business logic) and returning state to View
export function useSignupController(): SignupControllerOutput {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [mobile, setMobile] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Password strength calculated by AuthService
    const strength = getPasswordStrength(password);

    const toggleShowPw = useCallback(() => setShowPw(v => !v), []);

    // Format mobile via AuthService
    const handleMobileChange = useCallback((raw: string) => {
        setMobile(formatMobile(raw));
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate via AuthService
        const errs = validateSignup({ fullName, email, password, mobile });
        setErrors(errs);
        if (Object.keys(errs).length) return;

        setIsLoading(true);

        // Sign up via AuthService (wraps Supabase call)
        const result = await signUpUser({ fullName, email, password, mobile });

        setIsLoading(false);

        if (!result.success) {
            setErrors({ form: result.error ?? 'Signup failed. Please try again.' });
            return;
        }

        setSuccess(true);
    }, [fullName, email, password, mobile]);

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

