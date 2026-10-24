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

    // One-time trip texts for the trip just started (admins only for now)
    async startTripTexts(trip: {
        legs: { route: string; boardStopId: string; alightStopId: string }[];
        origin: { lat: number; lng: number }; destination: { lat: number; lng: number }; destinationName: string | null;
    }): Promise<{ texts: number; leaveAt: string; textsLeft: number }> {
        const r = await apiPost('/api/sms/trip', trip);
        return await r.json();
    },

    // Stops the texts still to come for that trip
    async cancelTripTexts(): Promise<void> {
        await apiPost('/api/sms/trip/cancel');
    },

    // Validates + updates phone on the backend, and auto-opts-out (forces re-consent).
    async updatePhone(phone: string): Promise<void> {
        await apiPatch('/api/sms/phone', { phone });
    },
};
