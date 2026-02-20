/**
 * UserRepository.ts — Data Access Layer for the `users` table.
 *
 * All SQL touching the `users` table lives here.
 * Matches the schema defined in schema.sql.
 */
import pool from '../db';

export interface DBUser {
    id: string;
    full_name: string;
    email: string;
    mobile_number: string | null;
    mobile_verified: boolean;
    email_verified: boolean;
    created_at: string;
    last_login_at: string | null;
    is_active: boolean;
    account_status: 'active' | 'suspended' | 'pending';
}

export class UserRepository {

    /** Return all users, newest first */
    async getAll(): Promise<DBUser[]> {
        const { rows } = await pool.query<DBUser>(
            `SELECT id, full_name, email, mobile_number, mobile_verified,
                    email_verified, created_at, last_login_at, is_active, account_status
             FROM users
             ORDER BY created_at DESC`
        );
        return rows;
    }

    /** Find one user by email */
    async findByEmail(email: string): Promise<DBUser | null> {
        const { rows } = await pool.query<DBUser>(
            `SELECT id, full_name, email, mobile_number, mobile_verified,
                    email_verified, created_at, last_login_at, is_active, account_status
             FROM users WHERE email = $1`,
            [email]
        );
        return rows[0] ?? null;
    }

    /** Find one user by id */
    async findById(id: string): Promise<DBUser | null> {
        const { rows } = await pool.query<DBUser>(
            `SELECT id, full_name, email, mobile_number, mobile_verified,
                    email_verified, created_at, last_login_at, is_active, account_status
             FROM users WHERE id = $1`,
            [id]
        );
        return rows[0] ?? null;
    }

    /**
     * Upsert a user on signup.
     * If the email already exists, does nothing (idempotent).
     * Returns the created or existing user.
     */
    async upsertOnSignup(params: {
        full_name: string;
        email: string;
        mobile_number?: string;
    }): Promise<DBUser> {
        const { full_name, email, mobile_number } = params;
        const { rows } = await pool.query<DBUser>(
            `INSERT INTO users (full_name, email, mobile_number, password_hash, account_status)
             VALUES ($1, $2, $3, 'app-auth', 'active')
             ON CONFLICT (email) DO UPDATE SET
                 full_name    = EXCLUDED.full_name,
                 updated_at   = now()
             RETURNING id, full_name, email, mobile_number, mobile_verified,
                       email_verified, created_at, last_login_at, is_active, account_status`,
            [full_name, email, mobile_number ?? null]
        );
        return rows[0];
    }

    /** Record a login — updates last_login_at */
    async recordLogin(email: string): Promise<void> {
        await pool.query(
            `UPDATE users SET last_login_at = now(), updated_at = now()
             WHERE email = $1`,
            [email]
        );
    }

    /** Toggle a user's account_status between 'active' and 'suspended' */
    async toggleStatus(id: string): Promise<DBUser | null> {
        const { rows } = await pool.query<DBUser>(
            `UPDATE users
             SET account_status = CASE
                 WHEN account_status = 'active'    THEN 'suspended'
                 WHEN account_status = 'suspended' THEN 'active'
                 ELSE 'active'
             END,
             updated_at = now()
             WHERE id = $1
             RETURNING id, full_name, email, mobile_number, mobile_verified,
                       email_verified, created_at, last_login_at, is_active, account_status`,
            [id]
        );
        return rows[0] ?? null;
    }

    /** Hard-delete a user (cascades to sessions, favourites etc.) */
    async deleteById(id: string): Promise<boolean> {
        const result = await pool.query(
            `DELETE FROM users WHERE id = $1`,
            [id]
        );
        return (result.rowCount ?? 0) > 0;
    }

    /** Delete by email — convenience for CLI */
    async deleteByEmail(email: string): Promise<boolean> {
        const result = await pool.query(
            `DELETE FROM users WHERE email = $1`,
            [email]
        );
        return (result.rowCount ?? 0) > 0;
    }

    /** Total user count */
    async count(): Promise<number> {
        const { rows } = await pool.query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM users`
        );
        return parseInt(rows[0].count, 10);
    }
}
