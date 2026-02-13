import { useState } from 'react';
import { mockNotifications } from '../../data/mock/adminMockData';

export function useNotificationCenterController() {
    const [activeTab, setActiveTab] = useState<'sms' | 'alerts' | 'settings'>('sms');
    const [notifications] = useState(mockNotifications);

    return {
        activeTab,
        setActiveTab,
        notifications
    };
}
