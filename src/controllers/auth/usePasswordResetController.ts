/**
 * usePasswordResetController.ts — Transit Regina
 *
 * Controllers for the forgot-password flow (MVC).
 * - useForgotPasswordController: emails a reset link
 * - useResetPasswordController:  sets the new password once the link has signed the user in
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../models/lib/supabase';
import { signOutOtherDevices } from '../../models/services/AuthService';
import { useAuth } from '../../models/context/AuthContext';
import { requestPasswordReset } from '../../models/services/AuthService';

export function useForgotPasswordController() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const err = await requestPasswordReset(email);
        setIsLoading(false);
        if (err) setError(err);
        else setSent(true);
    }, [email]);

    return { email, setEmail, error, isLoading, sent, handleSubmit };
}

export function useResetPasswordController() {
    // The recovery link's token is exchanged for a session by Supabase on page load,
    // so "has a session" === "link was valid".
    const { isAuthenticated } = useAuth();

    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [done, setDone] = useState(false);

    const toggleShowPw = useCallback(() => setShowPw(v => !v), []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password.length < 8) {
            setError('Minimum 8 characters required');
            return;
        }
        setIsLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        // A reset usually means the old password can't be trusted: end every other session too
        if (!error) await signOutOtherDevices();
        setIsLoading(false);
        if (error) setError(error.message);
        else setDone(true);
    }, [password]);

    return {
        linkValid: isAuthenticated,
        password, setPassword,
        showPw, toggleShowPw,
        error, isLoading, done,
        handleSubmit,
    };
}
