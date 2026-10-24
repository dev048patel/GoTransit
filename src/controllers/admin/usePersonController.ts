/**
 * usePersonController.ts — Transit Regina  [MVC Controller]
 * Everything about one person, and the actions an admin can take on them.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../models/lib/supabase';
import { apiGet, apiPatch, apiDelete, apiPost } from '../../models/lib/apiClient';
import { FEATURES, FeatureKey } from '../../models/admin/FeatureAccessTypes';
import type { ConfirmRequest } from '../../views/components/admin/ui';

export interface Person {
    profile: { id: string; full_name: string | null; email: string | null; role: string; account_status: string; mobile_number: string | null; mobile_verified: boolean | null; sms_opted_in: boolean | null; created_at: string; last_active: string | null };
    features: { feature: string; enabled: boolean }[];
    sessions: { browser: string; os: string; device: string; first_seen: string; last_seen: string; page_views: number }[];
    history: { type: string; severity: string; message: string; admin: string; created_at: string }[];
}

/** Enter the authenticator code again; the login token is refreshed with a new "code entered at" time. */
export async function verifyTwoStepCode(code: string): Promise<void> {
    const { data, error } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp[0];
    if (error || !factor) throw new Error('Two-step sign-in is not set up on this account');
    const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (verifyErr) throw new Error('That code is not right, or it has expired. Try the newest code.');
}

export function usePersonController(id: string) {
    const navigate = useNavigate();
    const [person, setPerson] = useState<Person | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
    const [name, setName] = useState('');

    const load = useCallback(async () => {
        try { const p: Person = await (await apiGet(`/api/admin/users/${id}`)).json(); setPerson(p); setName(p.profile.full_name ?? ''); setError(null); }
        catch (e) { setError((e as Error).message); }
    }, [id]);
    useEffect(() => { load(); }, [load]);

    const p = person?.profile;
    const who = p?.email || p?.full_name || 'this person';
    const patch = (fields: Record<string, unknown>) => async (reason: string) => { await apiPatch(`/api/admin/users/${id}`, { ...fields, reason }); await load(); };

    // A feature is on unless a row says otherwise
    const featureOn = (key: FeatureKey) => person?.features.find(f => f.feature === key)?.enabled ?? true;
    const toggleFeature = async (key: FeatureKey) => {
        try { await apiPost('/api/admin/fac/set', { userId: id, feature: key, enabled: !featureOn(key) }); await load(); }
        catch (e) { setError((e as Error).message); }
    };
    const saveName = async () => {
        try { await apiPatch(`/api/admin/users/${id}`, { full_name: name.trim() }); await load(); }
        catch (e) { setError((e as Error).message); }
    };

    // How much each action asks for scales with how much damage it could do
    const ask = {
        suspend: () => setConfirm({ title: `Suspend ${who}?`, body: 'They will be signed out and unable to sign in until an admin reactivates them.', confirmLabel: 'Suspend', danger: true, askReason: true, run: patch({ account_status: 'suspended' }) }),
        reactivate: () => setConfirm({ title: `Reactivate ${who}?`, body: 'They will be able to sign in again.', confirmLabel: 'Reactivate', run: patch({ account_status: 'active' }) }),
        makeAdmin: () => setConfirm({ title: `Make ${who} an admin?`, body: 'Admins can see every rider, change accounts and delete users. Only do this for people who run Transit Regina.', confirmLabel: 'Make admin', danger: true, askReason: true, typeToConfirm: p?.email ?? 'admin', run: patch({ role: 'admin' }) }),
        removeAdmin: () => setConfirm({ title: `Remove admin rights from ${who}?`, body: 'They will keep their rider account but lose the admin panel.', confirmLabel: 'Remove admin', danger: true, askReason: true, run: patch({ role: 'user' }) }),
        remove: () => setConfirm({
            title: `Delete ${who}?`, body: 'This permanently deletes the account and everything saved in it. It cannot be undone.', confirmLabel: 'Delete permanently', danger: true, askReason: true, typeToConfirm: p?.email ?? 'delete',
            run: async (reason) => { await apiDelete(`/api/admin/users/${id}`, { reason }); navigate('/admin/people', { replace: true }); },
        }),
    };

    return { person, error, confirm, closeConfirm: () => setConfirm(null), ask, name, setName, saveName, featureOn, toggleFeature, features: FEATURES };
}
