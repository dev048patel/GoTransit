/**
 * useLoginController.ts — GoTransit Regina
 *
 * Controller layer for the Login page (MVC).
 * - Owns all form state: identifier, password, errors, loading
 * - Delegates auth logic to AuthContext (login())
 * - On success: redirects to /map (or back to the originally-requested page)
 */

import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
    const navigate = useNavigate();
    const location = useLocation();

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    const isMobileDetected = /^\+?\d/.test(identifier.trim());

    const toggleShowPw = useCallback(() => setShowPw(v => !v), []);

    const handleLogin = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        const errs: Record<string, string> = {};
        if (!identifier.trim())
            errs.identifier = 'Enter your email or mobile number';
        else if (!isMobileDetected && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier))
            errs.identifier = 'Enter a valid email address';
        if (password.length < 6)
            errs.password = 'Password must be at least 6 characters';
        setErrors(errs);
        if (Object.keys(errs).length) return;

        setIsLoading(true);
        const ok = await login(identifier, password);
        setIsLoading(false);

        if (ok) {
            // Redirect back to the page the user originally tried to visit (if any)
            const from = (location.state as any)?.from?.pathname ?? '/map';
            navigate(from, { replace: true });
        } else {
            setErrors({ form: 'Invalid credentials. Please try again.' });
        }
    }, [identifier, password, isMobileDetected, login, navigate, location]);

    return {
        identifier, setIdentifier,
        password, setPassword,
        showPw, toggleShowPw,
        errors, isLoading,
        isMobileDetected,
        handleLogin,
    };
}
