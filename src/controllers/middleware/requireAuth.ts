import { Request, Response, NextFunction } from 'express';
import { supabaseServer } from '../../models/lib/supabaseServer';
import { userDb } from '../../models/lib/serverDb';
import { SecurityEventService } from '../../models/services/SecurityEventService';
import { clientIp } from './security';

// Extend Express Request so downstream handlers get typed user info
declare global {
    namespace Express {
        interface Request {
            user?: { id: string; email?: string; role: 'user' | 'admin'; token: string; twoStep: boolean; twoStepAt: number };
        }
    }
}

/** Whether this login passed the second step. Read from the token only after Supabase has verified it. */
function twoStepInfo(token: string): { passed: boolean; at: number } {
    try {
        const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
        // amr lists how this login was proven; the totp entry carries when the code was last entered (seconds)
        const totp = Array.isArray(claims.amr) ? claims.amr.find((m: { method?: string }) => m?.method === 'totp') : null;
        return { passed: claims.aal === 'aal2', at: Number(totp?.timestamp) || 0 };
    } catch { return { passed: false, at: 0 }; }
}

/** Reads and verifies the Bearer token. Returns the user, or null when there is none or it is not valid. */
export async function verifyRequest(req: Request): Promise<Express.Request['user'] | null> {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    const token = header.slice(7);
    const { data, error } = await supabaseServer.auth.getUser(token);
    if (error || !data.user) return null;

    // Role and status come from the user's own profile row, read with their own token
    const { data: profile } = await userDb(token).from('profiles').select('role, account_status').eq('id', data.user.id).single();
    if (profile?.account_status === 'suspended' || profile?.account_status === 'deleted') return null;
    const twoStep = twoStepInfo(token);
    return { id: data.user.id, email: data.user.email, role: profile?.role === 'admin' ? 'admin' : 'user', token, twoStep: twoStep.passed, twoStepAt: twoStep.at };
}

/**
 * Verifies the Supabase Bearer JWT in the Authorization header.
 * On success attaches `req.user` and calls next(). On failure returns 401 — never calls next().
 * Suspended and deleted accounts are refused even if their token is still valid.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const user = await verifyRequest(req);
    if (!user) {
        void SecurityEventService.record({ type: 'auth_failed', severity: 'warning', ip: clientIp(req), path: req.originalUrl,
            message: req.headers.authorization ? 'Invalid, expired or suspended login token' : 'No login token sent to a protected endpoint' });
        res.status(401).json({ error: 'Sign in required' });
        return;
    }
    req.user = user;
    next();
}
