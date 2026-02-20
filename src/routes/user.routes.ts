/**
 * user.routes.ts — REST API for user management
 *
 * Endpoints:
 *   GET    /api/users             → list all users
 *   GET    /api/users/:id         → get one user
 *   POST   /api/users/upsert      → signup / upsert
 *   POST   /api/users/login       → record login
 *   PATCH  /api/users/:id/status  → toggle active/suspended
 *   DELETE /api/users/:id         → delete user
 *   DELETE /api/users/email/:email → delete by email (CLI convenience)
 *   GET    /api/users/count       → total user count
 */
import { Router, Request, Response } from 'express';
import { UserRepository } from '../repositories/UserRepository';

const router = Router();
const repo = new UserRepository();

/* ── GET /api/users ─────────────────────────────────────────────── */
router.get('/', async (_req: Request, res: Response) => {
    try {
        const users = await repo.getAll();
        res.json(users);
    } catch (err) {
        console.error('[Users] getAll error', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/* ── GET /api/users/count ───────────────────────────────────────── */
router.get('/count', async (_req: Request, res: Response) => {
    try {
        const count = await repo.count();
        res.json({ count });
    } catch (err) {
        res.status(500).json({ error: 'Failed to count users' });
    }
});

/* ── GET /api/users/:id ─────────────────────────────────────────── */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const user = await repo.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

/* ── POST /api/users/upsert ─────────────────────────────────────── */
router.post('/upsert', async (req: Request, res: Response) => {
    try {
        const { full_name, email, mobile_number } = req.body;
        if (!full_name || !email) {
            return res.status(400).json({ error: 'full_name and email are required' });
        }
        const user = await repo.upsertOnSignup({ full_name, email, mobile_number });
        res.status(201).json(user);
    } catch (err) {
        console.error('[Users] upsert error', err);
        res.status(500).json({ error: 'Failed to upsert user' });
    }
});

/* ── POST /api/users/login ──────────────────────────────────────── */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'email is required' });
        await repo.recordLogin(email);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to record login' });
    }
});

/* ── PATCH /api/users/:id/status ────────────────────────────────── */
router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
        const user = await repo.toggleStatus(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Failed to toggle status' });
    }
});

/* ── DELETE /api/users/email/:email ─────────────────────────────── */
router.delete('/email/:email', async (req: Request, res: Response) => {
    try {
        const deleted = await repo.deleteByEmail(req.params.email);
        if (!deleted) return res.status(404).json({ error: 'User not found' });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

/* ── DELETE /api/users/:id ──────────────────────────────────────── */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const deleted = await repo.deleteById(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'User not found' });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
