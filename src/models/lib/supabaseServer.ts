/*
  Server-side Supabase client.
  Uses process.env (loaded by dotenv in server.ts) instead of import.meta.env.
*/

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY as string;

export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
