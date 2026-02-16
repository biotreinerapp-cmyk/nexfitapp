
import { createClient } from '@supabase/supabase-js';

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || "https://afffyfsmcvphrhbtxrgt.supabase.co";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

async function checkExercise() {
    const { data, error } = await supabase
        .from("biblioteca_exercicios")
        .select("nome, video_url")
        .ilike("nome", "%Kettlebell Concentration Curl%")
        .limit(5);

    if (error) {
        console.error(error);
    } else {
        console.log("Found exercises:", data);
    }
}

checkExercise();
