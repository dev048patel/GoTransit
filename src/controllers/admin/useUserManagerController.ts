/**
 * useUserManagerController.ts — GoTransit Regina  [MVC Controller]
 *
 * Real users only — from Supabase profiles table.
 * Provides handlers for: Edit details, Temporary Ban (24h), Soft Delete.
 *
 * These mutations require admin RLS policies on public.profiles.
 * See the comment block in UserRegistry.ts for the SQL to run.
 */

import { useState, useEffect, useCallback } from 'react';
import { User } from '../../models/admin/AdminTypes';
import { getAllUsers, updateUserProfile, softDeleteUser } from '../../services/UserRegistry';

export interface EditFields {
    full_name: string;
    role: string;
    account_status: string;
}

export function useUserManagerController() {
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [actionError, setActionError] = useState<string | null>(null);

    // Edit modal
    const [editTarget, setEditTarget] = useState<User | null>(null);
    const [editFields, setEditFields] = useState<EditFields>({ full_name: '', role: 'user', account_status: 'active' });
    const [editLoading, setEditLoading] = useState(false);

    const loadUsers = useCallback(async () => {
        const data = await getAllUsers();
        setUsers(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadUsers();
        const interval = setInterval(loadUsers, 15_000);
        return () => clearInterval(interval);
    }, [loadUsers]);

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    /* ── Edit ─────────────────────────────────────────────────────── */
    const openEdit = (user: User) => {
        setEditTarget(user);
        setEditFields({ full_name: user.name, role: user.role, account_status: user.status === 'Active' ? 'active' : 'suspended' });
        setActionError(null);
    };

    const closeEdit = () => {
        setEditTarget(null);
        setActionError(null);
    };

    const saveEdit = async () => {
        if (!editTarget) return;
        setEditLoading(true);
        const err = await updateUserProfile(editTarget.id, {
            full_name: editFields.full_name.trim(),
            role: editFields.role,
            account_status: editFields.account_status,
        });
        setEditLoading(false);
        if (err) { setActionError(err); return; }
        await loadUsers();
        closeEdit();
    };

    /* ── Temporary Ban (24 h) ─────────────────────────────────────── */
    const banUser = async (user: User) => {
        setActionError(null);
        const err = await updateUserProfile(user.id, { account_status: 'suspended' });
        if (err) { setActionError(err); return; }
        await loadUsers();
    };

    /* ── Delete ───────────────────────────────────────────────────── */
    const deleteUser = async (user: User) => {
        setActionError(null);
        const err = await softDeleteUser(user.id);
        if (err) { setActionError(err); return; }
        setUsers(prev => prev.filter(u => u.id !== user.id));
    };

    return {
        users: filteredUsers,
        isLoading,
        searchTerm,
        setSearchTerm,
        actionError,
        // Edit modal
        editTarget, editFields, setEditFields, editLoading,
        openEdit, closeEdit, saveEdit,
        // Actions
        banUser, deleteUser,
    };
}
