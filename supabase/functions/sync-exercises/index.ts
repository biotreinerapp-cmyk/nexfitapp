import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init?.headers || {}),
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_ANON_KEY) {
      console.error("SUPABASE_ANON_KEY not configured.");
      return jsonResponse({ error: "Configuração de backend incompleta." });
    }

    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!token) return jsonResponse({ error: "Token de autenticação ausente." });

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token} ` } },
    });

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Sua sessão expirou ou é inválida. Faça login novamente." });
    }

    const caller = userData.user;
    const MASTER_EMAIL = "biotreinerapp@gmail.com";

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (roleError) {
      console.error("Erro validando admin role", roleError);
      return jsonResponse({ error: "Falha ao verificar permissões." });
    }

    const authorized = Boolean(isAdmin) || (caller.email ?? "").toLowerCase() === MASTER_EMAIL;
    if (!authorized) {
      return jsonResponse({ error: "Acesso negado: apenas administradores." });
    }

    // Ação única: Dropar as agendas de treino dos alunos.
    // Como estamos usando a chave SERVICE_ROLE na const global `supabase`, ignoramos RLS restritivos.
    console.log("Chamada para aplicar curadoria: Apagando agendas_treinos desatualizadas.");

    const { error: resetError } = await supabase.from("agenda_treinos").delete().not("id", "is", null);

    if (resetError) {
      console.error("Erro ao resetar agendas", resetError);
      return jsonResponse(
        { error: "Erro ao resetar agendas", details: resetError.message }
      );
    }

    return jsonResponse({
      agendas_reset: true,
      message: "Todas as agendas de treino antigas foram excluídas com sucesso. O sistema agora exigirá que os aplicativos dos alunos gerem novas agendas utilizando a base curada."
    });

  } catch (err) {
    console.error("Unexpected error in sync-exercises (reset) function", err);
    return jsonResponse({ error: "Erro inesperado ao aplicar atualizações aos alunos." }, { status: 500 });
  }
});
