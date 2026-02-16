
import { createClient } from '@supabase/supabase-js';

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://afffyfsmcvphrhbtxrgt.supabase.co";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

async function checkAnyVideo() {
    const { data, error } = await supabase
        .from("biblioteca_exercicios")
        .select("nome, video_url")
        .not("video_url", "is", null)
        .limit(10);

    if (error) {
        console.error(error);
    } else {
        console.log("Found exercises with video:", data);
    }

    const { count } = await supabase
        .from("biblioteca_exercicios")
        .select("*", { count: 'exact', head: true })
        .not("video_url", "is", null);

    console.log("Total exercises with video_url:", count);
}

checkAnyVideo();
