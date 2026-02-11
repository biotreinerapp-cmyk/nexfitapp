import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXERCISEDB_API_KEY_ENV = Deno.env.get("EXERCISEDB_API_KEY");
const EXERCISEDB_HOST = Deno.env.get("EXERCISEDB_HOST") ?? "exercisedb.p.rapidapi.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl: string;
}

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
    let apiKeyToUse = EXERCISEDB_API_KEY_ENV;

    if (!apiKeyToUse) {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key_value")
        .eq("key_name", "exercisedb_api_key")
        .maybeSingle();

      if (error) {
        console.error("Erro ao ler app_settings", error);
        return jsonResponse({ error: "Erro ao ler configuração da ExerciseDB" }, { status: 500 });
      }

      apiKeyToUse = (data?.key_value as string | undefined) ?? undefined;
    }

    if (!apiKeyToUse) {
      return jsonResponse(
        {
          error:
            "API key da ExerciseDB não configurada. Defina a chave em app_settings (exercisedb_api_key) ou como EXERCISEDB_API_KEY.",
        },
        { status: 500 },
      );
    }

    const url = `https://${EXERCISEDB_HOST}/exercises?limit=200`;
    const apiResponse = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": apiKeyToUse,
        "x-rapidapi-host": EXERCISEDB_HOST,
      },
    });

    if (!apiResponse.ok) {
      const text = await apiResponse.text();
      console.error("ExerciseDB error", apiResponse.status, text);
      return jsonResponse(
        {
          error: "Erro ao buscar exercícios na ExerciseDB",
          details: text,
          statusCode: apiResponse.status,
        },
        { status: apiResponse.status },
      );
    }

    const exercises = (await apiResponse.json()) as Exercise[];

    const withGif = exercises.filter((ex) => !!ex.gifUrl);
    const withoutGif = exercises.length - withGif.length;

    if (withoutGif > 0) {
      console.warn(
        `sync-exercises: ${withoutGif} exercícios retornaram sem gifUrl. Eles ainda serão importados, porém sem vídeo.`,
      );
    }

    const mapped = exercises.slice(0, 200).map((ex) => ({
      external_id: ex.id,
      nome: ex.name,
      body_part: ex.bodyPart,
      target_muscle: ex.target,
      equipment: ex.equipment,
      video_url: ex.gifUrl ?? null,
    }));

    // Segurança: não apaga a biblioteca se a API não retornou itens válidos
    if (mapped.length === 0) {
      console.warn(
        `sync-exercises: nenhum exercício retornado pela API (total=${exercises.length}). Biblioteca preservada.`,
      );
      return jsonResponse({
        imported: 0,
        details: "Nenhum exercício foi retornado pela ExerciseDB. A biblioteca atual foi preservada. Verifique a API key/plano (RapidAPI) e tente novamente.",
      });
    }

    // Substitui completamente a biblioteca para garantir que todos registros tenham video_url válido
    const { error: deleteError } = await supabase.from("biblioteca_exercicios").delete().not("id", "is", null);

    if (deleteError) {
      console.error("Erro ao limpar biblioteca_exercicios", deleteError);
      return jsonResponse({ error: "Erro ao limpar biblioteca de exercícios" }, { status: 500 });
    }

    const { error } = await supabase.from("biblioteca_exercicios").insert(mapped);

    if (error) {
      console.error("Erro ao salvar na biblioteca_exercicios", error);
      return jsonResponse({ error: "Erro ao salvar exercícios no banco" }, { status: 500 });
    }

    return jsonResponse({ imported: mapped.length });
  } catch (err) {
    console.error("Unexpected error in sync-exercises function", err);
    return jsonResponse({ error: "Erro inesperado ao sincronizar exercícios" }, { status: 500 });
  }
});
