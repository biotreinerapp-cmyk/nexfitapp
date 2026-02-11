import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...(init?.headers ?? {}) },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error("ensure-admin-master: env vars ausentes", {
      hasUrl: Boolean(SUPABASE_URL),
      hasAnon: Boolean(SUPABASE_ANON_KEY),
      hasServiceRole: Boolean(SERVICE_ROLE_KEY),
    });
    return json({ error: "Configuração de backend incompleta" }, { status: 500 });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!token) return json({ error: "Token de autenticação ausente" }, { status: 401 });

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      console.warn("ensure-admin-master: JWT inválido", userError);
      return json({ error: "JWT inválido ou expirado" }, { status: 401 });
    }

    const caller = userData.user;
    const MASTER_EMAIL = "biotreinerapp@gmail.com";

    if ((caller.email ?? "").toLowerCase() !== MASTER_EMAIL) {
      return json({ ok: true, changed: false });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (existingError) {
      console.error("ensure-admin-master: erro ao checar role", existingError);
      return json({ error: "Falha ao verificar permissões" }, { status: 500 });
    }

    if (existing?.id) {
      return json({ ok: true, changed: false });
    }

    const { error: insertError } = await supabaseAdmin.from("user_roles").insert({
      user_id: caller.id,
      role: "admin",
    });

    if (insertError) {
      console.error("ensure-admin-master: erro ao inserir role", insertError);
      return json({ error: insertError.message }, { status: 400 });
    }

    return json({ ok: true, changed: true });
  } catch (err) {
    console.error("ensure-admin-master error:", err);
    return json({ error: err instanceof Error ? err.message : "Erro desconhecido" }, { status: 500 });
  }
});
