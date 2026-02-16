
import { createClient } from '@supabase/supabase-js';

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || "https://afffyfsmcvphrhbtxrgt.supabase.co";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

async function checkVideo() {
    // Fetch one item with video_url
    const { data, error } = await supabase
        .from("biblioteca_exercicios")
        .select("video_url")
        .not("video_url", "is", null)
        .limit(1)
        .single();

    if (error || !data) {
        console.error("No exercises with video found.");
        return;
    }

    const videoUrl = data.video_url;
    console.log(`Testing video URL: ${videoUrl}`);

    try {
        const response = await fetch(videoUrl); // No headers!
        console.log(`Status code (no headers): ${response.status}`);
        // If protected, it might return 401/403

        if (response.status === 401 || response.status === 403) {
            console.log("Video URL is protected (requires headers/auth). This is the problem.");
        } else {
            console.log("Video URL seems accessible (maybe). Content-Type:", response.headers.get('content-type'));
        }
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}

checkVideo();
