import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Supabase Client ──────────────────────────────────────────────────────────
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
        headers: { "Content-Type": "application/json", ...corsHeaders, ...(init?.headers || {}) },
    });
}

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A "slot" defines how many exercises from a given muscle group we need.
 * equipment_priority: if provided, we prefer exercises using that equipment first.
 */
interface MuscleSlot {
    target_muscle: string;   // ex: 'peito', 'tríceps', 'ombro'
    count: number;           // how many exercises to pick
    sets?: number;           // override default sets
    reps?: number | null;    // override default reps (null = até a falha)
    duration_seconds?: number | null; // for time-based exercises
    rest_seconds?: number;   // override default rest
}

/**
 * A Goal Template groups equipment preference + muscle slots.
 */
interface GoalTemplate {
    name: string;                        // ex: "Peito e Tríceps"
    difficulty_level: "iniciante" | "intermediario" | "avancado";
    duration_minutes?: number;
    goal?: string;                       // ex: "hipertrofia"
    equipment_priority?: string[];       // ex: ["halter", "peso_corporal"]
    slots: MuscleSlot[];
}

/** Built-in library of goal templates */
const GOAL_TEMPLATES: Record<string, GoalTemplate> = {
    peito_triceps: {
        name: "Peito e Tríceps",
        difficulty_level: "intermediario",
        duration_minutes: 60,
        goal: "hipertrofia",
        equipment_priority: ["halter", "peso_corporal", "barra"],
        slots: [
            { target_muscle: "peito", count: 3, sets: 4, reps: 12, rest_seconds: 60 },
            { target_muscle: "tríceps", count: 2, sets: 3, reps: 12, rest_seconds: 60 },
            { target_muscle: "ombro", count: 1, sets: 3, reps: 15, rest_seconds: 45 },
        ],
    },
    costas_biceps: {
        name: "Costas e Bíceps",
        difficulty_level: "intermediario",
        duration_minutes: 60,
        goal: "hipertrofia",
        equipment_priority: ["halter", "barra", "peso_corporal"],
        slots: [
            { target_muscle: "costas", count: 3, sets: 4, reps: 10, rest_seconds: 75 },
            { target_muscle: "bíceps", count: 2, sets: 3, reps: 12, rest_seconds: 60 },
            { target_muscle: "lombar", count: 1, sets: 3, reps: 15, rest_seconds: 45 },
        ],
    },
    pernas: {
        name: "Pernas Completo",
        difficulty_level: "avancado",
        duration_minutes: 75,
        goal: "força",
        equipment_priority: ["barra", "halter", "peso_corporal"],
        slots: [
            { target_muscle: "quadríceps", count: 3, sets: 4, reps: 12, rest_seconds: 90 },
            { target_muscle: "posterior", count: 2, sets: 3, reps: 12, rest_seconds: 75 },
            { target_muscle: "glúteos", count: 2, sets: 3, reps: 15, rest_seconds: 60 },
        ],
    },
    full_body: {
        name: "Full Body Funcional",
        difficulty_level: "iniciante",
        duration_minutes: 45,
        goal: "resistência",
        equipment_priority: ["peso_corporal"],
        slots: [
            { target_muscle: "peito", count: 1, sets: 3, reps: 12, rest_seconds: 45 },
            { target_muscle: "costas", count: 1, sets: 3, reps: 12, rest_seconds: 45 },
            { target_muscle: "pernas", count: 2, sets: 3, reps: 15, rest_seconds: 45 },
            { target_muscle: "abdômen", count: 1, sets: 3, reps: null, duration_seconds: 30, rest_seconds: 30 },
            { target_muscle: "ombro", count: 1, sets: 3, reps: 15, rest_seconds: 45 },
        ],
    },
};

// ─── Core Logic ───────────────────────────────────────────────────────────────

interface Exercise {
    id: string;
    name: string;
    target_muscle: string;
    equipment: string | null;
}

/**
 * Fetch candidate exercises for a specific muscle from the DB.
 * Only verified exercises of type 'exercise' are considered.
 */
async function fetchCandidates(targetMuscle: string): Promise<Exercise[]> {
    const { data, error } = await supabase
        .from("exercises")
        .select("id, name, target_muscle, equipment")
        .eq("is_verified", true)
        .eq("type", "exercise")
        // Case-insensitive partial match to handle minor spelling variants
        .ilike("target_muscle", `%${targetMuscle}%`);

    if (error) {
        console.error(`Erro ao buscar exercícios para '${targetMuscle}'`, error);
        return [];
    }
    return (data ?? []) as Exercise[];
}

/**
 * Score exercícios baseado na prioridade de equipamento.
 * Higher score = better match. Returns sorted array (best first).
 */
function sortByEquipmentPriority(
    exercises: Exercise[],
    priorities: string[]
): Exercise[] {
    if (!priorities.length) return exercises;

    return [...exercises].sort((a, b) => {
        const scoreOf = (ex: Exercise) => {
            const eq = (ex.equipment ?? "").toLowerCase();
            for (let i = 0; i < priorities.length; i++) {
                if (eq.includes(priorities[i].toLowerCase())) return priorities.length - i;
            }
            return 0; // no priority match
        };
        return scoreOf(b) - scoreOf(a);
    });
}

/**
 * Pick `count` exercises from candidates, avoiding duplicates.
 * Uses equipment priority ordering + random shuffle for variety within the same tier.
 */
function pickExercises(
    candidates: Exercise[],
    count: number,
    equipmentPriority: string[],
    alreadyPicked: Set<string>
): Exercise[] {
    const available = candidates.filter((ex) => !alreadyPicked.has(ex.id));
    const sorted = sortByEquipmentPriority(available, equipmentPriority);

    // Within each priority tier, add a small random shuffle for variety
    const tiers: Map<number, Exercise[]> = new Map();
    sorted.forEach((ex) => {
        const eq = (ex.equipment ?? "").toLowerCase();
        let score = 0;
        for (let i = 0; i < equipmentPriority.length; i++) {
            if (eq.includes(equipmentPriority[i].toLowerCase())) {
                score = equipmentPriority.length - i;
                break;
            }
        }
        if (!tiers.has(score)) tiers.set(score, []);
        tiers.get(score)!.push(ex);
    });

    // Shuffle within each tier for variety, then flatten respecting order
    const sortedScores = [...tiers.keys()].sort((a, b) => b - a);
    const tieredShuffled: Exercise[] = [];
    for (const score of sortedScores) {
        const group = tiers.get(score)!;
        // Fisher-Yates shuffle
        for (let i = group.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [group[i], group[j]] = [group[j], group[i]];
        }
        tieredShuffled.push(...group);
    }

    return tieredShuffled.slice(0, count);
}

/**
 * Main generator: creates a workout + inserts workout_exercises.
 */
async function generateWorkout(
    template: GoalTemplate,
    createdBy?: string
): Promise<{ workoutId: string; exerciseCount: number; warnings: string[] }> {
    const warnings: string[] = [];
    const equipmentPriority = template.equipment_priority ?? [];

    // ① Create the workout record
    const { data: workout, error: wError } = await supabase
        .from("workouts")
        .insert({
            name: template.name,
            description: `Treino gerado automaticamente — ${template.goal ?? "objetivo geral"}`,
            difficulty_level: template.difficulty_level,
            duration_minutes: template.duration_minutes,
            goal: template.goal,
            is_active: true,
            is_public: false,
            created_by: createdBy ?? null,
        })
        .select("id")
        .single();

    if (wError || !workout) {
        throw new Error(`Falha ao criar treino: ${wError?.message}`);
    }

    const workoutId: string = workout.id;
    const pickedIds = new Set<string>();
    const workoutExercises: Array<{
        workout_id: string;
        exercise_id: string;
        order: number;
        sets: number;
        reps: number | null;
        duration_seconds: number | null;
        rest_seconds: number;
    }> = [];

    let order = 1;

    // ② For each muscle slot, fetch candidates and pick exercises
    for (const slot of template.slots) {
        const candidates = await fetchCandidates(slot.target_muscle);

        if (!candidates.length) {
            warnings.push(
                `Nenhum exercício verificado encontrado para músculo: '${slot.target_muscle}'. Slot ignorado.`
            );
            continue;
        }

        const picked = pickExercises(candidates, slot.count, equipmentPriority, pickedIds);

        if (picked.length < slot.count) {
            warnings.push(
                `Esperados ${slot.count} exercícios para '${slot.target_muscle}', encontrados apenas ${picked.length}.`
            );
        }

        for (const ex of picked) {
            pickedIds.add(ex.id);
            workoutExercises.push({
                workout_id: workoutId,
                exercise_id: ex.id,
                order: order++,
                sets: slot.sets ?? 3,
                reps: slot.reps !== undefined ? slot.reps : 10,
                duration_seconds: slot.duration_seconds ?? null,
                rest_seconds: slot.rest_seconds ?? 60,
            });
        }
    }

    if (workoutExercises.length === 0) {
        // Roll back the workout if nothing was generated
        await supabase.from("workouts").delete().eq("id", workoutId);
        throw new Error("Nenhum exercício disponível para nenhum dos grupos musculares do template.");
    }

    // ③ Insert all workout_exercises in a single batch
    const { error: weError } = await supabase
        .from("workout_exercises")
        .insert(workoutExercises);

    if (weError) {
        // Roll back workout on insert failure
        await supabase.from("workouts").delete().eq("id", workoutId);
        throw new Error(`Falha ao inserir exercícios no treino: ${weError.message}`);
    }

    return { workoutId, exerciseCount: workoutExercises.length, warnings };
}

// ─── HTTP Handler ─────────────────────────────────────────────────────────────

/**
 * Expected request body:
 * {
 *   template_key?: string;           // key from GOAL_TEMPLATES (ex: "peito_triceps")
 *   custom_template?: GoalTemplate;  // OR provide a fully custom template
 *   created_by?: string;             // user UUID (optional)
 * }
 */
serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, { status: 405 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { template_key, custom_template, created_by } = body;

        let template: GoalTemplate | undefined;

        if (custom_template) {
            template = custom_template as GoalTemplate;
        } else if (template_key) {
            template = GOAL_TEMPLATES[template_key as string];
            if (!template) {
                return jsonResponse(
                    {
                        error: `Template '${template_key}' não encontrado.`,
                        available_templates: Object.keys(GOAL_TEMPLATES),
                    },
                    { status: 400 }
                );
            }
        } else {
            return jsonResponse(
                {
                    error: "Informe 'template_key' ou 'custom_template' no body.",
                    available_templates: Object.keys(GOAL_TEMPLATES),
                },
                { status: 400 }
            );
        }

        const result = await generateWorkout(template, created_by);

        return jsonResponse({
            success: true,
            workout_id: result.workoutId,
            exercises_added: result.exerciseCount,
            warnings: result.warnings,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("generate-workout error:", message);
        return jsonResponse({ error: message }, { status: 500 });
    }
});
