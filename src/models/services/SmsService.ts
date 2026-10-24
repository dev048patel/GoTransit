import { apiPost, apiPatch } from '../lib/apiClient';

export const SmsService = {
    async optIn(): Promise<void> {
        await apiPost('/api/sms/opt-in');
    },

    async optOut(): Promise<void> {
        await apiPost('/api/sms/opt-out');
    },

    // Texts a one-time code to the number on the profile
    async sendVerifyCode(): Promise<void> {
        await apiPost('/api/sms/verify/send');
    },

    // Marks the number verified if the code is right; returns the number as saved
    async checkVerifyCode(code: string): Promise<string> {
        const r = await apiPost('/api/sms/verify/check', { code });
        return ((await r.json()) as { phone: string }).phone;
    },

    // Validates + updates phone on the backend, and auto-opts-out (forces re-consent).
    async updatePhone(phone: string): Promise<void> {
        await apiPatch('/api/sms/phone', { phone });
    },
};
