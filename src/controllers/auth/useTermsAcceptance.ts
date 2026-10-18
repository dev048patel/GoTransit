// useTermsAcceptance — whether the signed-in account still has to agree to the current Terms and Privacy policy.
// New accounts agree on the signup form; existing accounts are stopped on the sign-in page until they agree.
import { useState } from 'react';
import { useAuth } from '../../models/context/AuthContext';
import { acceptTerms } from '../../models/services/AuthService';
import { SITE } from '../../models/data/legal';

export function useTermsAcceptance() {
    const { isAuthenticated, user, logout, termsLoaded, refreshTerms } = useAuth();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    /** Signed in, but the agreement on record is missing or out of date */
    const needed = isAuthenticated && termsLoaded && !!user && user.termsVersion !== SITE.TERMS_VERSION;
    /** Signed in, and the agreement is still being read: don't decide anything yet */
    const checking = isAuthenticated && !termsLoaded;

    const agree = async () => {
        setSaving(true);
        setError('');
        const problem = await acceptTerms();
        if (problem) setError(problem);
        else await refreshTerms();
        setSaving(false);
    };

    return { needed, checking, agree, saving, error, signOut: logout };
}
