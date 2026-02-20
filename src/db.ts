/**
 * db.ts — PostgreSQL connection pool
 *
 * Single shared pool used across all repositories.
 * Connection string is read from DATABASE_URL env var (set by Railway automatically).
 */
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Railway provides DATABASE_URL with sslmode=require; enforce it here.
    ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error', err);
});

export default pool;
