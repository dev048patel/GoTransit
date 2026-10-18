/**
 * useLoginController.ts — Transit Regina
 *
 * Controller layer for the Login page (MVC).
 * - Owns all form state: identifier, password, errors, loading
 * - Delegates validation to AuthService
 * - Delegates auth logic to AuthContext (login())
 * - On success: redirects to /map (or back to the originally-requested page)
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../../models/context/AuthContext';
import { validateLogin, isMobileNumber } from '../../models/services/AuthService';

interface LoginControllerOutput {
    identifier: string;
    setIdentifier: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    showPw: boolean;
    toggleShowPw: () => void;
    errors: Record<string, string>;
    isLoading: boolean;
    isMobileDetected: boolean;
    handleLogin: (e: React.FormEvent) => void;
}

export function useLoginController(): LoginControllerOutput {
    const { login } = useAuth();

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Detect if the user is typing a mobile number (service helper)
    const isMobileDetected = isMobileNumber(identifier);

    const toggleShowPw = useCallback(() => setShowPw(v => !v), []);

    const handleLogin = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate via AuthService
        const errs = validateLogin({ identifier, password });
        setErrors(errs);
        if (Object.keys(errs).length) return;

        setIsLoading(true);
        const loginError = await login(identifier, password);
        setIsLoading(false);

        // On success the sign-in page itself moves on: straight to where they were going, or first to
        // the Terms step if this account hasn't agreed to the current version (see PublicOnlyRoute)
        if (loginError) setErrors({ form: loginError });
    }, [identifier, password, login]);

    return {
        identifier, setIdentifier,
        password, setPassword,
        showPw, toggleShowPw,
        errors, isLoading,
        isMobileDetected,
        handleLogin,
    };
}

