/**
 * AuthModel.ts — GoTransit Regina
 *
 * Shape of the authenticated user.
 * Session management is handled entirely by Supabase Auth.
 */

export interface User {
    fullName: string;
    email: string;
    mobile?: string;
    role: 'user' | 'admin';
}
