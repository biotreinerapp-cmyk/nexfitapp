
import { createClient } from '@supabase/supabase-js';

// Retrying with User Provided Key
// Retrying with User Provided Key
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://afffyfsmcvphrhbtxrgt.supabase.co";
const MUSCLEWIKI_HOST = "musclewiki-api.p.rapidapi.com";
const RAPIDAPI_KEY = "7abffdb721mshe6edf9169775d83p1212ffjsn4c407842489b";

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Please set SUPABASE_SERVICE_ROLE_KEY env var");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

async function runSync() {
    console.log("Starting local sync...");

    const baseUrl = `https://${MUSCLEWIKI_HOST}/exercises`;
    let nextUrl = `${baseUrl}?limit=50`;
    let exercises = [];
    let pageCount = 0;
    const MAX_PAGES = 100;

    try {
        while (nextUrl && pageCount < MAX_PAGES) {
            pageCount++;
            console.log(`Fetching page ${pageCount}: ${nextUrl}`);

            const apiResponse = await fetch(nextUrl, {
                method: "GET",
                headers: {
                    "x-rapidapi-key": RAPIDAPI_KEY,
                    "x-rapidapi-host": MUSCLEWIKI_HOST,
                },
            });

            if (!apiResponse.ok) {
                const text = await apiResponse.text();
                console.error(`API Error: ${apiResponse.status} ${text}`);
                // If error on page 1, abort. Else break loop and save what we have.
                if (pageCount === 1) throw new Error("Failed on first page");
                break;
            }

            const jsonBody = await apiResponse.json();
            let pageResults = [];

            if (Array.isArray(jsonBody)) {
                pageResults = jsonBody;
                nextUrl = null;
            } else {
                pageResults = jsonBody.results || [];
                nextUrl = jsonBody.next || null;
            }

            // Fix nextUrl if it's http
            if (nextUrl && nextUrl.startsWith('http:')) {
                nextUrl = nextUrl.replace('http:', 'https:');
            }

            exercises = exercises.concat(pageResults);
            console.log(`Page ${pageCount} fetched. Total so far: ${exercises.length}`);

            if (!nextUrl) {
                console.log("No next URL found. Creating manual next URL via offset if possible?");
                // MuscleWiki documentation isn't clear on offset, but usually nextUrl is provided.
                // If nextUrl is null, we assume end of list.
                // Let's try to infer if we need more?
                // If we got 50 items (limit), there might be more.
                if (pageResults.length === 50) {
                    const offset = pageCount * 50;
                    nextUrl = `${baseUrl}?limit=50&offset=${offset}`;
                    console.log(`Guessing next URL: ${nextUrl}`);
                }
            }
        }

        console.log(`Fetched total ${exercises.length} exercises.`);

        if (exercises.length === 0) {
            console.log("No exercises found.");
            return;
        }

        const mapped = exercises.map((ex) => {
            let videoUrl = null;
            if (Array.isArray(ex.videoURL) && ex.videoURL.length > 0) {
                videoUrl = ex.videoURL[0];
            } else if (typeof ex.videoURL === "string") {
                videoUrl = ex.videoURL;
            }

            return {
                external_id: String(ex.id),
                nome: ex.name,
                body_part: ex.category,
                target_muscle: ex.target || ex.bodyPart,
                equipment: ex.category?.toLowerCase() || "bodyweight",
                video_url: videoUrl,
                instrucoes: ex.steps || [],
            };
        });

        console.log("Deleting existing exercises...");
        const { error: deleteError } = await supabase.from("biblioteca_exercicios").delete().not("id", "is", null);
        if (deleteError) throw deleteError;

        console.log("Inserting new exercises...");
        const chunkSize = 500;
        for (let i = 0; i < mapped.length; i += chunkSize) {
            const chunk = mapped.slice(i, i + chunkSize);
            const { error } = await supabase.from("biblioteca_exercicios").insert(chunk);
            if (error) {
                console.error(`Error inserting chunk ${i}:`, error);
                throw error;
            }
            console.log(`Inserted chunk ${Math.ceil((i + 1) / chunkSize)}`);
        }

        console.log("Sync complete!");

    } catch (err) {
        console.error("Sync failed:", err);
    }
}

runSync();
