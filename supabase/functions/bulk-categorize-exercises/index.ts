import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Official vocabulary ───────────────────────────────────────────────────────

const MUSCLES = [
    "Peito", "Costas", "Bíceps", "Tríceps", "Ombros",
    "Pernas", "Glúteos", "Abdômen", "Panturrilha", "Antebraço",
    "Trapézio", "Lombar", "Cardio", "Corpo Todo",
];

const EQUIPMENTS = [
    "Barra", "Halter", "Kettlebell", "Cabo", "Máquina",
    "Peso Corporal", "Elástico", "TRX", "Banco", "Anilha",
];

// ─── Gemini call ──────────────────────────────────────────────────────────────

interface GeminiResult {
    muscle: string;
    equipment: string;
    is_exercise: boolean;
}

async function classifyExercise(name: string): Promise<GeminiResult | null> {
    const prompt = `
Você é um especialista em educação física.
Dado o NOME DE UM EXERCÍCIO abaixo, retorne SOMENTE um JSON válido (sem markdown, sem explicações) com três campos:
  - "muscle": EXATAMENTE um dos valores da lista: ${MUSCLES.join(", ")}
  - "equipment": EXATAMENTE um dos valores da lista: ${EQUIPMENTS.join(", ")}
  - "is_exercise": booleano (false caso seja apenas uma dica de saúde/nutrição e não um exercício físico real)

Regras:
- Se o nome for uma dica de alimentação ou hábito de saúde, defina is_exercise = false; muscle = "Corpo Todo"; equipment = "Peso Corporal"
- Responda APENAS com o JSON, por exemplo: {"muscle":"Peito","equipment":"Halter","is_exercise":true}

Nome do exercício: "${name}"
`.trim();

    try {
        const res = await fetch(GEMINI_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    topK: 1,
                    topP: 1,
                    maxOutputTokens: 128,
                },
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(`[Gemini] ${res.status}:`, err);
            return null;
        }

        const data = await res.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        // Strip potential markdown fences
        const cleaned = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned) as GeminiResult;

        // Validate against official lists
        if (!MUSCLES.includes(parsed.muscle)) parsed.muscle = "Corpo Todo";
        if (!EQUIPMENTS.includes(parsed.equipment)) parsed.equipment = "Peso Corporal";

        return parsed;
    } catch (e) {
        console.error(`[Gemini] Parse error for "${name}":`, e);
        return null;
    }
}

// ─── Sleep helper ─────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Optional: accept { batch_size, delay_ms, dry_run } from body
        let batchSize = 10;
        let delayMs = 500;   // throttle: 500 ms between calls
        let dryRun = false;

        try {
            const body = await req.json();
            if (typeof body?.batch_size === "number") batchSize = Math.min(body.batch_size, 50);
            if (typeof body?.delay_ms === "number") delayMs = body.delay_ms;
            if (typeof body?.dry_run === "boolean") dryRun = body.dry_run;
        } catch { /* no body — use defaults */ }

        // 1. Fetch all exercises where muscle is still uncategorized
        const { data: exercises, error: fetchError } = await supabase
            .from("exercises")
            .select("id, name")
            .or("target_muscle.eq.Geral,target_muscle.is.null,target_muscle.eq.")
            .order("id")
            .limit(batchSize);

        if (fetchError) throw fetchError;
        if (!exercises || exercises.length === 0) {
            return new Response(
                JSON.stringify({ message: "Nenhum exercício para categorizar.", updated: 0 }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        let updated = 0;
        let skipped = 0;
        const errors: { id: string; name: string; reason: string }[] = [];

        for (const ex of exercises) {
            const result = await classifyExercise(ex.name ?? "");

            if (!result) {
                skipped++;
                errors.push({ id: ex.id, name: ex.name ?? "", reason: "Gemini retornou null" });
                await sleep(delayMs);
                continue;
            }

            if (!dryRun) {
                const updatePayload: Record<string, unknown> = {
                    target_muscle: result.muscle,
                    equipment: result.equipment,
                };

                // Only set type if the column exists (migration applied)
                if (!result.is_exercise) {
                    updatePayload.type = "wellness_tip";
                }

                const { error: updateError } = await supabase
                    .from("exercises")
                    .update(updatePayload)
                    .eq("id", ex.id);

                if (updateError) {
                    errors.push({ id: ex.id, name: ex.name ?? "", reason: updateError.message });
                    skipped++;
                } else {
                    updated++;
                }
            } else {
                console.log(`[DRY RUN] ${ex.name} → muscle:${result.muscle} equipment:${result.equipment} is_exercise:${result.is_exercise}`);
                updated++;
            }

            await sleep(delayMs);
        }

        const response = {
            processed: exercises.length,
            updated,
            skipped,
            dry_run: dryRun,
            errors: errors.length > 0 ? errors : undefined,
        };

        return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[bulk-categorize-exercises] Fatal error:", message);
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
