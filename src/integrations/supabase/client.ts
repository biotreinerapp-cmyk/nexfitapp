// Redeploy trigger: SSD space resolved
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Nome das variáveis: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://affyfsmcvphrhbtxrgt.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZnlmZnNtY3ZwaHJoYnR4cmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNjU1NDYsImV4cCI6MjA4MjY0MTU0Nn0.cpLjvUADTJxzdr0MGIZFai_zYHPbnaU2P1I-EyDoqnw";

// Logs de Diagnóstico (Seguros)
if (typeof window !== "undefined") {
    console.log("[SupabaseInit] Verificando configuração...");
    console.log("[SupabaseInit] URL:", supabaseUrl);
    console.log("[SupabaseInit] Origem da URL:", import.meta.env.VITE_SUPABASE_URL ? "ENV" : "FALLBACK");

    const keyPrefix = supabaseAnonKey?.substring(0, 10);
    const keySuffix = supabaseAnonKey?.substring(supabaseAnonKey.length - 5);
    console.log(`[SupabaseInit] Key (${import.meta.env.VITE_SUPABASE_ANON_KEY ? "ENV" : "FALLBACK"}): ${keyPrefix}...${keySuffix}`);

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("REPLACE_WITH")) {
        console.error("[SupabaseInit] CRITICAL: Invalid configuration detected!");
    }
}

export const supabase = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey
);
