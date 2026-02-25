import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

// gemini-2.0-flash confirmed working via v1beta for this project's API key
const GEMINI_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategorizeResult {
    muscle: string;
    equipment: string;
    is_exercise: boolean;
}

// ─── Classify a single exercise ──────────────────────────────────────────────

async function classifyExercise(
    name: string,
): Promise<{ result: CategorizeResult | null; error?: string }> {
    const prompt =
        `Você é um especialista em educação física. Analise o título abaixo e classifique-o.\n\n` +
        `REGRAS OBRIGATÓRIAS:\n` +
        `1. "muscle" deve ser EXATAMENTE um destes: ${MUSCLES.join(", ")}.\n` +
        `   - Analise o título semanticamente. Ex: "Alargar as Costas" → Costas, "Flexionar Braço" → Bíceps.\n` +
        `   - Se envolver todo o corpo ou for cardio: use "Cardio" ou "Corpo Todo".\n` +
        `2. "equipment" deve ser EXATAMENTE um destes: ${EQUIPMENTS.join(", ")}.\n` +
        `   - Se não precisar de equipamento: use "Peso Corporal".\n` +
        `3. "is_exercise" = true se for exercício físico.\n` +
        `   - Defina false se for dica de saúde, alimentação, hábito ou conselho de bem-estar.\n` +
        `   - Ex: "Adicione proteína à dieta" → is_exercise: false.\n\n` +
        `Retorne SOMENTE o JSON, sem markdown nem texto adicional.\n` +
        `Exemplo: {"muscle":"Peito","equipment":"Halter","is_exercise":true}\n\n` +
        `Título: "${name}"`;

    try {
        const res = await fetch(GEMINI_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 100 },
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            const msg = data?.error?.message ?? JSON.stringify(data);
            return { result: null, error: `HTTP ${res.status}: ${msg}` };
        }

        const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
        const cleaned = raw.replace(/```json|```/g, "").trim();

        if (!cleaned) {
            return { result: null, error: `Resposta vazia (finishReason: ${data?.candidates?.[0]?.finishReason})` };
        }

        const parsed = JSON.parse(cleaned) as CategorizeResult;

        // Enforce official vocabulary
        if (!MUSCLES.includes(parsed.muscle)) parsed.muscle = "Corpo Todo";
        if (!EQUIPMENTS.includes(parsed.equipment)) parsed.equipment = "Peso Corporal";
        if (typeof parsed.is_exercise !== "boolean") parsed.is_exercise = true;

        return { result: parsed };
    } catch (e) {
        return { result: null, error: e instanceof Error ? e.message : String(e) };
    }
}

// ─── Sleep ────────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const jsonResp = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    try {
        if (!GEMINI_API_KEY) {
            return jsonResp({ error: "GEMINI_API_KEY não configurada nos Secrets." }, 500);
        }

        // Defaults: small batch + generous delays to respect free-tier quota
        let batchSize = 5;    // 5 exercises per run
        let delayMs = 10_000; // 10s between each API call
        let dryRun = false;

        try {
            const body = await req.json();
            if (typeof body?.batch_size === "number") batchSize = Math.min(body.batch_size, 20);
            if (typeof body?.delay_ms === "number") delayMs = body.delay_ms;
            if (typeof body?.dry_run === "boolean") dryRun = body.dry_run;
        } catch { /* no body */ }

        // ── 1. Fetch uncategorized exercises ─────────────────────────────────────
        const { data: exercises, error: fetchError } = await supabase
            .from("exercises")
            .select("id, name")
            .or("target_muscle.eq.Geral,target_muscle.is.null")
            .order("id")
            .limit(batchSize);

        if (fetchError) throw fetchError;

        if (!exercises || exercises.length === 0) {
            return jsonResp({ message: "✅ Todos os exercícios já foram categorizados!", updated: 0 });
        }

        // ── 2. Classify each exercise with delay ─────────────────────────────────
        let updated = 0;
        let skipped = 0;
        const errors: { id: string; name: string; reason: string }[] = [];

        for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];

            const { result, error: aiError } = await classifyExercise(ex.name ?? "");

            if (!result) {
                skipped++;
                errors.push({ id: ex.id, name: ex.name ?? "", reason: aiError ?? "AI retornou null" });
            } else if (!dryRun) {
                const payload: Record<string, unknown> = {
                    target_muscle: result.muscle,
                    equipment: result.equipment,
                };
                if (!result.is_exercise) payload.type = "wellness_tip";

                const { error: updateError } = await supabase
                    .from("exercises")
                    .update(payload)
                    .eq("id", ex.id);

                if (updateError) {
                    errors.push({ id: ex.id, name: ex.name ?? "", reason: updateError.message });
                    skipped++;
                } else {
                    updated++;
                    console.log(`✅ [${i + 1}/${exercises.length}] ${ex.name} → ${result.muscle} / ${result.equipment}`);
                }
            } else {
                // dry run
                console.log(`[DRY] ${ex.name} → ${result.muscle} / ${result.equipment} / is_exercise=${result.is_exercise}`);
                updated++;
            }

            // Delay between requests to respect rate limits (skip after last item)
            if (i < exercises.length - 1) {
                await sleep(delayMs);
            }
        }

        return jsonResp({
            processed: exercises.length,
            updated,
            skipped,
            dry_run: dryRun,
            errors,
            next_step: exercises.length === batchSize
                ? `Clique novamente para categorizar mais ${batchSize} exercícios`
                : "Lote concluído!",
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[bulk-categorize-exercises] Fatal:", message);
        return jsonResp({ error: message }, 500);
    }
});
