import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../models/context/AuthContext';
import { UserAccessRecord, FeatureKey, FEATURES } from '../../models/admin/FeatureAccessTypes';
import {
    getAllUsersWithAccess,
    setFeatureAccess,
    resetUserAccess,
    setFeatureForAll,
} from '../../models/services/FeatureAccessAdminService';

/** 'on' = all users enabled, 'off' = all users disabled, 'mixed' = some of each */
export type GlobalFeatureState = 'on' | 'off' | 'mixed';

export function useFeatureAccessController() {
    const { user } = useAuth();
    const [users, setUsers] = useState<UserAccessRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState<string>(''); // "userId:feature" | "reset:userId" | "all:feature"

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getAllUsersWithAccess();
            setUsers(data);
        } catch {
            setError('Failed to load user access data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    /** Toggle a single user's access to one feature */
    const handleToggle = useCallback(async (userId: string, feature: FeatureKey, newValue: boolean) => {
        if (!user) return;
        const key = `${userId}:${feature}`;
        setSaving(key);

        setUsers(prev => prev.map(u =>
            u.userId === userId
                ? { ...u, access: { ...u.access, [feature]: newValue } }
                : u,
        ));

        try {
            await setFeatureAccess(userId, feature, newValue, user.id);
        } catch {
            setUsers(prev => prev.map(u =>
                u.userId === userId
                    ? { ...u, access: { ...u.access, [feature]: !newValue } }
                    : u,
            ));
        } finally {
            setSaving('');
        }
    }, [user]);

    /** Toggle a feature for ALL users at once */
    const handleToggleAll = useCallback(async (feature: FeatureKey, newValue: boolean) => {
        if (!user) return;
        const key = `all:${feature}`;
        setSaving(key);

        // Optimistic: flip every user's flag for this feature
        setUsers(prev => prev.map(u => ({
            ...u,
            access: { ...u.access, [feature]: newValue },
        })));

        try {
            await setFeatureForAll(feature, newValue, user.id, users.map(u => u.userId));
        } catch {
            setUsers(prev => prev.map(u => ({
                ...u,
                access: { ...u.access, [feature]: !newValue },
            })));
        } finally {
            setSaving('');
        }
    }, [user, users]);

    /** Reset all features to enabled for one user */
    const handleReset = useCallback(async (userId: string) => {
        setSaving(`reset:${userId}`);
        setUsers(prev => prev.map(u =>
            u.userId === userId
                ? { ...u, access: Object.fromEntries(Object.keys(u.access).map(k => [k, true])) as UserAccessRecord['access'] }
                : u,
        ));
        try {
            await resetUserAccess(userId);
        } catch {
            load();
        } finally {
            setSaving('');
        }
    }, [load]);

    const filteredUsers = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return users;
        return users.filter(u =>
            u.email.toLowerCase().includes(q) ||
            (u.fullName && u.fullName.toLowerCase().includes(q)),
        );
    }, [users, search]);

    const stats = useMemo(() => {
        const total = users.length;
        const restricted = users.filter(u => Object.values(u.access).some(v => !v)).length;
        return { total, restricted };
    }, [users]);

    /** Per-feature global state derived from all users */
    const globalFeatureState = useMemo(() => {
        const result = {} as Record<FeatureKey, GlobalFeatureState>;
        for (const f of FEATURES) {
            if (users.length === 0) { result[f.key] = 'on'; continue; }
            const allOn  = users.every(u => u.access[f.key]);
            const allOff = users.every(u => !u.access[f.key]);
            result[f.key] = allOn ? 'on' : allOff ? 'off' : 'mixed';
        }
        return result;
    }, [users]);

    return {
        filteredUsers, loading, error, search, setSearch,
        saving, handleToggle, handleToggleAll, handleReset,
        refresh: load, stats, globalFeatureState,
    };
}
