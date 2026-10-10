/**
 * @file env.ts
 * @description Loads environment variables from .env.local (only needed locally; Railway sets vars directly).
 * @purpose Must be the first import in server.ts — ES imports are hoisted, so calling dotenv.config()
 *          inline would run after other modules (e.g. supabaseServer) have already read process.env.
 */
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
