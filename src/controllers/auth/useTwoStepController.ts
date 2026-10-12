/**
 * useTwoStepController.ts — Transit Regina
 *
 * Two-step sign-in for admins (MVC controller).
 *  - No authenticator app registered yet → 'setup': shows a QR code to scan, then asks for a code.
 *  - Already registered → 'verify': asks for the current code.
 * A correct code upgrades this login, which is what the admin panel and backend require.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../models/lib/supabase';
import { useAuth } from '../../models/context/AuthContext';

type Mode = 'loading' | 'setup' | 'verify';

export function useTwoStepController() {
    const { isAdmin, roleLoaded, twoStepPassed } = useAuth();
    const navigate = useNavigate();

    const [mode, setMode] = useState<Mode>('loading');
    const [factorId, setFactorId] = useState('');
    const [qr, setQr] = useState('');          // image of the QR code (data URL)
    const [secret, setSecret] = useState('');  // the same key as text, for typing in by hand
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!roleLoaded || !isAdmin || twoStepPassed) return;
        let cancelled = false;
        (async () => {
            const { data, error: listErr } = await supabase.auth.mfa.listFactors();
            if (cancelled) return;
            if (listErr) { setError(listErr.message); return; }
            const ready = data.totp[0];
            if (ready) { setFactorId(ready.id); setMode('verify'); return; }

            // Clear out any setup that was started but never finished, then start a fresh one
            for (const f of data.all.filter(f => f.factor_type === 'totp' && f.status !== 'verified')) {
                await supabase.auth.mfa.unenroll({ factorId: f.id });
            }
            const { data: enrolled, error: enrolErr } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator app' });
            if (cancelled) return;
            if (enrolErr || !enrolled) { setError(enrolErr?.message ?? 'Could not start setup'); return; }
            setFactorId(enrolled.id); setQr(enrolled.totp.qr_code); setSecret(enrolled.totp.secret); setMode('setup');
        })();
        return () => { cancelled = true; };
    }, [roleLoaded, isAdmin, twoStepPassed]);

    // Once the login is upgraded (the session token changes), go on to the admin panel
    useEffect(() => { if (twoStepPassed) navigate('/admin', { replace: true }); }, [twoStepPassed, navigate]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code from your authenticator app'); return; }
        setBusy(true);
        const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
        setBusy(false);
        if (verifyErr) { setError('That code is not right, or it has expired. Try the newest code.'); setCode(''); }
    }, [factorId, code]);

    return { mode, qr, secret, code, setCode, error, busy, handleSubmit, notAdmin: roleLoaded && !isAdmin };
}
