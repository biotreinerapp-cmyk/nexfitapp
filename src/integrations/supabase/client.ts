// Redeploy trigger: SSD space resolved
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseUrl = (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0 && envUrl !== "REPLACE_WITH_YOUR_SUPABASE_URL")
    ? envUrl.trim()
    : "https://afffyfsmcvphrhbtxrgt.supabase.co";

const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseAnonKey = (envKey && typeof envKey === 'string' && envKey.trim().length > 0 && envKey !== "REPLACE_WITH_YOUR_SUPABASE_ANON_KEY")
    ? envKey.trim()
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZmZ5ZnNtY3ZwaHJoYnR4cmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNjU1NDYsImV4cCI6MjA4MjY0MTU0Nn0.cpLjvUADTJxzdr0MGIZFai_zYHPbnaU2P1I-EyDoqnw";

// Logs de Diagnóstico (Seguros)
if (typeof window !== "undefined") {
    const isProduction = import.meta.env.PROD;
    console.log(`[SupabaseInit] [PROD:${isProduction}] Verificando configuração...`);
    console.log("[SupabaseInit] URL:", supabaseUrl);
    console.log("[SupabaseInit] Origem da URL:", import.meta.env.VITE_SUPABASE_URL ? "ENV" : "FALLBACK");

    const keyPrefix = supabaseAnonKey?.substring(0, 10);
    const keySuffix = supabaseAnonKey?.substring(supabaseAnonKey?.length - 5);
    console.log(`[SupabaseInit] Key (${import.meta.env.VITE_SUPABASE_ANON_KEY ? "ENV" : "FALLBACK"}): ${keyPrefix}...${keySuffix}`);

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("REPLACE_WITH")) {
        console.error("[SupabaseInit] CRITICAL: Invalid configuration detected!");
    }

    if (isProduction && (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY)) {
        console.warn("[SupabaseInit] WARNING: Production build is using FALLBACK values. Ensure VITE_ variables are set in Render.");
    }
}

export const supabase = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey
);
