import { apiPost, apiPatch } from '../lib/apiClient';

export const SmsService = {
    async optIn(): Promise<void> {
        await apiPost('/api/sms/opt-in');
    },

    async optOut(): Promise<void> {
        await apiPost('/api/sms/opt-out');
    },

    // Validates + updates phone on the backend, and auto-opts-out (forces re-consent).
    async updatePhone(phone: string): Promise<void> {
        await apiPatch('/api/sms/phone', { phone });
    },
};
