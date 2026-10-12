import { Request, Response, NextFunction } from 'express';
import { SecurityEventService } from '../../models/services/SecurityEventService';
import { clientIp } from './security';

/**
 * Must be used after requireAuth (relies on req.user being set, including its role).
 * Returns 403 if the user is signed in but not an admin, or is an admin who has not
 * completed two-step sign-in, and records the attempt.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) { res.status(401).json({ error: 'Sign in required' }); return; }
    if (req.user.role !== 'admin') {
        void SecurityEventService.record({ type: 'admin_denied', severity: 'warning', ip: clientIp(req), userId: req.user.id, path: req.originalUrl,
            message: 'A non-admin account tried to use an admin endpoint' });
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    // A password alone is not enough for admin powers: the login must have passed the authenticator-app step
    if (!req.user.twoStep) {
        void SecurityEventService.record({ type: 'admin_two_step_missing', severity: 'warning', ip: clientIp(req), userId: req.user.id, path: req.originalUrl,
            message: 'An admin account used an admin endpoint without completing two-step sign-in' });
        res.status(403).json({ error: 'Two-step sign-in required', code: 'two_step_required' });
        return;
    }
    next();
}
