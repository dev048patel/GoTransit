import { Request, Response, NextFunction } from 'express';
import { supabaseServer } from '../../models/lib/supabaseServer';

// Extend Express Request so downstream handlers get typed user info
declare global {
    namespace Express {
        interface Request {
            user?: { id: string; email?: string };
        }
    }
}

/**
 * Verifies the Supabase Bearer JWT in the Authorization header.
 * On success attaches `req.user = { id, email }` and calls next().
 * On failure returns 401 — never calls next().
 */
export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or malformed Authorization header' });
        return;
    }

    const token = header.slice(7);
    const { data, error } = await supabaseServer.auth.getUser(token);

    if (error || !data.user) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }

    req.user = { id: data.user.id, email: data.user.email };
    next();
}
