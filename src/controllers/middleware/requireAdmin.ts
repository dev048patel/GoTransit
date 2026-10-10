import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../../models/lib/supabaseAdmin';

/**
 * Must be used after requireAuth (relies on req.user being set).
 * Queries the profiles table to confirm role = 'admin'.
 * Returns 403 if the user is authenticated but not an admin.
 */
export async function requireAdmin(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    let db;
    try {
        db = getSupabaseAdmin();
    } catch {
        res.status(503).json({ error: 'Admin client not configured' });
        return;
    }

    const { data, error } = await db
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

    if (error || data?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }

    next();
}
