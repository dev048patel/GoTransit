import { useState } from 'react';
import { mockUsers } from '../../data/mock/adminMockData';
import { User } from '../../models/admin/AdminTypes';

export function useUserManagerController() {
    const [users, setUsers] = useState<User[]>(mockUsers);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return {
        users: filteredUsers,
        searchTerm,
        setSearchTerm
    };
}
