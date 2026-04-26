import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../models/lib/supabaseAdmin';

const router = Router();

// Hard-delete a user from auth.users (cascades to profiles via FK)
router.delete('/users/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) {
        console.error('[Admin] Delete user error:', error.message);
        res.status(500).json({ error: error.message });
        return;
    }
    res.json({ ok: true });
});

// Set a single feature flag for one user
router.post('/fac/set', async (req: Request, res: Response) => {
    const { userId, feature, enabled, adminId } = req.body;
    const { error } = await supabaseAdmin
        .from('feature_access')
        .upsert(
            { user_id: userId, feature, enabled, updated_by: adminId, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,feature' },
        );
    if (error) {
        console.error('[Admin] Set feature error:', error.message);
        res.status(500).json({ error: error.message });
        return;
    }
    res.json({ ok: true });
});

// Delete all feature_access rows for a user (resets to full access)
router.delete('/fac/reset/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { error } = await supabaseAdmin
        .from('feature_access')
        .delete()
        .eq('user_id', userId);
    if (error) {
        console.error('[Admin] Reset access error:', error.message);
        res.status(500).json({ error: error.message });
        return;
    }
    res.json({ ok: true });
});

// Toggle a feature for ALL users at once
router.post('/fac/set-all', async (req: Request, res: Response) => {
    const { feature, enabled, adminId, userIds } = req.body as {
        feature: string; enabled: boolean; adminId: string; userIds: string[];
    };

    if (enabled) {
        // Enable = delete all restriction rows for this feature
        const { error } = await supabaseAdmin
            .from('feature_access')
            .delete()
            .eq('feature', feature);
        if (error) {
            console.error('[Admin] Set-all enable error:', error.message);
            res.status(500).json({ error: error.message });
            return;
        }
    } else {
        // Disable = upsert a disabled row for every user
        const rows = userIds.map(userId => ({
            user_id: userId,
            feature,
            enabled: false,
            updated_by: adminId,
            updated_at: new Date().toISOString(),
        }));
        const { error } = await supabaseAdmin
            .from('feature_access')
            .upsert(rows, { onConflict: 'user_id,feature' });
        if (error) {
            console.error('[Admin] Set-all disable error:', error.message);
            res.status(500).json({ error: error.message });
            return;
        }
    }

    res.json({ ok: true });
});

export default router;
