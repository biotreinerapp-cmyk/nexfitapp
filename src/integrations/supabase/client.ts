import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        "Supabase credentials missing! Check your environment variables.",
        { hasUrl: !!supabaseUrl, hasKey: !!supabaseAnonKey }
    );
}

export const supabase = createClient<Database>(
    supabaseUrl || "",
    supabaseAnonKey || ""
);
