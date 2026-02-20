/**
 * useUserManagerController.ts — GoTransit Regina  [MVC Controller]
 *
 * Merges REAL registered users (from UserRegistry/localStorage) with
 * mock users, so the admin can see actual signups immediately.
 * Real users appear at the top; mock users fill the rest of the table.
 */

import { useState, useEffect } from 'react';
import { mockUsers } from '../../data/mock/adminMockData';
import { User } from '../../models/admin/AdminTypes';
import { getAllUsers } from '../../services/UserRegistry';

export function useUserManagerController() {
    const [searchTerm, setSearchTerm] = useState('');
    const [realUsers, setRealUsers] = useState<User[]>([]);

    // Poll the API every 5 seconds so new signups appear without page refresh
    useEffect(() => {
        const load = async () => setRealUsers(await getAllUsers());
        load();
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, []);

    // Real users come first (marked with 'Traveler' role + real timestamps)
    // Mock users fill the rest — IDs are prefixed differently so no collision
    const allUsers: User[] = [
        ...realUsers,
        // Only show mock users if they don't clash with a real email
        ...mockUsers.filter(m => !realUsers.some(r => r.email === m.email)),
    ];

    const filteredUsers = allUsers.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return {
        users: filteredUsers,
        realUserCount: realUsers.length,
        searchTerm,
        setSearchTerm,
    };
}
