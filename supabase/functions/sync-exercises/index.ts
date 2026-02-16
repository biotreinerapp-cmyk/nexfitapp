import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Use existing key or fallback to specific one
const RAPIDAPI_KEY_ENV = Deno.env.get("RAPIDAPI_KEY") ?? Deno.env.get("EXERCISEDB_API_KEY");
const MUSCLEWIKI_HOST = "musclewiki-api.p.rapidapi.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MuscleWikiExercise {
  id: number;
  name: string;
  target: string;
  category: string; // "Stretches", "Bodyweight", "Barbell" etc (maps to equipment/type)
  bodyPart: string; // e.g. "Biceps" (maps to body_part or target_muscle)
  videoURL: string[];
  details: string;
  steps: string[];
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
    const { apiKey } = await req.json().catch(() => ({}));
    let apiKeyToUse = apiKey ?? RAPIDAPI_KEY_ENV;

    if (!apiKeyToUse) {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key_value")
        .eq("key_name", "exercisedb_api_key") // Use exiting key setting if available
        .maybeSingle();

      if (error) {
        console.error("Erro ao ler app_settings", error);
        return jsonResponse({ error: "Erro ao ler configuração da API" }, { status: 500 });
      }

      apiKeyToUse = (data?.key_value as string | undefined) ?? undefined;
    }

    if (!apiKeyToUse) {
      return jsonResponse(
        {
          error:
            "API key (RapidAPI) não configurada. Defina a chave em app_settings (exercisedb_api_key) ou como env var.",
        },
        { status: 500 },
      );
    }

    // MuscleWiki API restricts limit, likely to 100 or less (got 422 with 2000).
    // We'll iterate until we have all exercises or hit a safety limit.
    const baseUrl = `https://${MUSCLEWIKI_HOST}/exercises`;
    let nextUrl: string | null = `${baseUrl}?limit=50`;
    console.log(`Starting fetch loop from ${nextUrl}...`);

    let exercises: MuscleWikiExercise[] = [];
    let pageCount = 0;
    const MAX_PAGES = 50; // Safety break

    while (nextUrl && pageCount < MAX_PAGES) {
      pageCount++;
      const apiResponse = await fetch(nextUrl, {
        method: "GET",
        headers: {
          "x-rapidapi-key": apiKeyToUse,
          "x-rapidapi-host": MUSCLEWIKI_HOST,
        },
      });

      if (!apiResponse.ok) {
        const text = await apiResponse.text();
        console.error(`MuscleWiki API error on page ${pageCount}`, apiResponse.status, text);
        // If we have some exercises, maybe we continue? But partial sync is dangerous if we wipe DB.
        // Let's abort if it's the first page, otherwise warn and stop?
        if (pageCount === 1) {
          return jsonResponse(
            {
              error: "Erro ao buscar exercícios na MuscleWiki API",
              details: text,
              statusCode: apiResponse.status,
            },
            { status: apiResponse.status },
          );
        } else {
          console.warn("Aborting fetch loop due to error on subsequent page.");
          break;
        }
      }

      const jsonBody = (await apiResponse.json()) as any;
      let pageResults: MuscleWikiExercise[] = [];

      if (Array.isArray(jsonBody)) {
        pageResults = jsonBody;
        nextUrl = null; // No pagination info in array response
      } else {
        pageResults = jsonBody.results ?? [];
        nextUrl = jsonBody.next ? jsonBody.next : null;

        // Ensure nextUrl uses https and correct host if needed
        if (nextUrl && !nextUrl.startsWith("http")) {
          nextUrl = null;
        }
      }

      exercises = exercises.concat(pageResults);
      console.log(`Page ${pageCount}: fetched ${pageResults.length} items. Total: ${exercises.length}. Next: ${nextUrl}`);
    }

    console.log(`Fetched total ${exercises.length} exercises from MuscleWiki.`);

    // Map fields
    const mapped = exercises.map((ex) => {
      // videoURL is typically an array of strings like ["...video1.mp4", "...video2.mp4"]
      // We take the first one
      let videoUrl: string | null = null;
      if (Array.isArray(ex.videoURL) && ex.videoURL.length > 0) {
        videoUrl = ex.videoURL[0];
      } else if (typeof ex.videoURL === "string") {
        videoUrl = ex.videoURL;
      }

      return {
        external_id: String(ex.id),
        nome: ex.name,
        body_part: ex.category, // e.g. "Dumbbells", "Bodyweight" - acts like equipment often
        target_muscle: ex.target || ex.bodyPart, // MuscleWiki uses target/bodyPart roughly interchangeably
        equipment: ex.category?.toLowerCase() || "bodyweight",
        video_url: videoUrl,
        instrucoes: ex.steps ?? [],
      };
    });

    const withVideo = mapped.filter((ex) => !!ex.video_url);
    const withoutVideo = mapped.length - withVideo.length;

    if (withoutVideo > 0) {
      console.warn(
        `sync-exercises: ${withoutVideo} exercícios retornaram sem vídeo.`,
      );
    }

    if (mapped.length === 0) {
      return jsonResponse({
        imported: 0,
        details: "Nenhum exercício encontrado na API.",
      });
    }

    // Replace library
    const { error: deleteError } = await supabase.from("biblioteca_exercicios").delete().not("id", "is", null);

    if (deleteError) {
      console.error("Erro ao limpar biblioteca_exercicios", deleteError);
      return jsonResponse({ error: "Erro ao limpar biblioteca de exercícios" }, { status: 500 });
    }

    // Insert in chunks of 500 to avoid request size limits
    const chunkSize = 500;
    for (let i = 0; i < mapped.length; i += chunkSize) {
      const chunk = mapped.slice(i, i + chunkSize);
      const { error } = await supabase.from("biblioteca_exercicios").insert(chunk);
      if (error) {
        console.error(`Erro ao inserir chunk ${i}`, error);
        // Continue trying other chunks? Or fail? Let's fail for safety.
        return jsonResponse({ error: "Erro ao salvar exercícios no banco (chunk insert)" }, { status: 500 });
      }
    }

    return jsonResponse({ imported: mapped.length });
  } catch (err) {
    console.error("Unexpected error in sync-exercises function", err);
    return jsonResponse({ error: "Erro inesperado ao sincronizar exercícios" }, { status: 500 });
  }
});
