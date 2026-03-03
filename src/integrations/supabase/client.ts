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
    console.group(`[SupabaseInit] [PROD:${isProduction}]`);
    console.log("URL:", supabaseUrl);
    console.log("Origem da URL:", import.meta.env.VITE_SUPABASE_URL ? "ENV" : "FALLBACK");

    const keyPrefix = supabaseAnonKey?.substring(0, 10);
    const keySuffix = supabaseAnonKey?.substring(supabaseAnonKey?.length - 5);
    console.log(`Key (${import.meta.env.VITE_SUPABASE_ANON_KEY ? "ENV" : "FALLBACK"}): ${keyPrefix}...${keySuffix}`);

    // Validação de Projeto (Extração do ID do JWT)
    try {
        const payloadBase64 = supabaseAnonKey.split('.')[1];
        if (payloadBase64) {
            const payload = JSON.parse(atob(payloadBase64));
            const keyProjectId = payload.ref || payload.iss?.split('.')[0];
            const urlProjectId = supabaseUrl.split('//')[1]?.split('.')[0];

            console.log("ID do Projeto (Key):", keyProjectId);
            console.log("ID do Projeto (URL):", urlProjectId);

            if (keyProjectId !== urlProjectId) {
                console.error("CRITICAL: Mismatch detectado! O Anon Key pertence a um projeto diferente da URL.");
            }
        }
    } catch (e) {
        console.warn("Não foi possível validar o ID do projeto via Token.");
    }

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("REPLACE_WITH")) {
        console.error("CRITICAL: Invalid configuration detected!");
    }

    if (isProduction && (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY)) {
        console.warn("WARNING: Production build is using FALLBACK values. Ensure VITE_ variables are set in Render.");
    }
    console.groupEnd();
}

// Debugger de requisições (opcional para investigar headers no console em produção)
const customFetch = async (url: string, options: any) => {
    if (url.includes("/auth/v1/")) {
        console.group(`[SupabaseAuthRequest] ${url}`);
        console.log("Method:", options?.method);
        console.log("Headers:", options?.headers);
        // Não logamos o body por segurança, a menos que seja estritamente necessário
        console.groupEnd();
    }
    return fetch(url, options);
};

export const supabase = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
        global: {
            fetch: customFetch
        }
    }
);
