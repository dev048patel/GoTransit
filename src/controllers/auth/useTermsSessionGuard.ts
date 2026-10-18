// useTermsSessionGuard — a signed-in session that hasn't agreed to the current Terms only lives on the
// agreement step. If the rider goes anywhere else without agreeing (back to the home page, or a saved
// session reopening the app), they are signed out, so "Sign in" starts again with the normal form:
// password first, then the agreement.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTermsAcceptance } from './useTermsAcceptance';

/* Where an unagreed session may stay: the agreement step, and the documents it links to */
const ALLOWED = ['/login', '/terms', '/privacy', '/about'];

export function useTermsSessionGuard() {
    const { needed, signOut } = useTermsAcceptance();
    const { pathname } = useLocation();

    useEffect(() => {
        if (needed && !ALLOWED.includes(pathname)) void signOut();
    }, [needed, pathname, signOut]);
}
