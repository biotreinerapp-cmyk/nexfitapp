
import { createClient } from '@supabase/supabase-js';

// Retrying with User Provided Key
// Retrying with User Provided Key
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://afffyfsmcvphrhbtxrgt.supabase.co";
const MUSCLEWIKI_HOST = "musclewiki-api.p.rapidapi.com";
const RAPIDAPI_KEY = "7abffdb721mshe6edf9169775d83p1212ffjsn4c407842489b";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

async function runSync() {
    console.log("Starting full sync with details...");

    // 1. Fetch all IDs first (summary list)
    const baseUrl = `https://${MUSCLEWIKI_HOST}/exercises`;
    let nextUrl = `${baseUrl}?limit=50`;
    let summaryList = [];
    let pageCount = 0;
    const MAX_PAGES = 100;

    try {
        console.log("Step 1: Fetching summary list of all exercises...");
        while (nextUrl && pageCount < MAX_PAGES) {
            pageCount++;
            // console.log(`Fetching summary page ${pageCount}: ${nextUrl}`);

            const apiResponse = await fetch(nextUrl, {
                method: "GET",
                headers: {
                    "x-rapidapi-key": RAPIDAPI_KEY,
                    "x-rapidapi-host": MUSCLEWIKI_HOST,
                },
            });

            if (!apiResponse.ok) {
                console.error(`API Error: ${apiResponse.status}`);
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

            if (nextUrl && nextUrl.startsWith('http:')) {
                nextUrl = nextUrl.replace('http:', 'https:');
            }

            summaryList = summaryList.concat(pageResults);
            process.stdout.write(`\rFetched ${summaryList.length} descriptions...`);

            // Auto-paginate guess if needed (same as before)
            if (!nextUrl && pageResults.length === 50) {
                const offset = pageCount * 50;
                nextUrl = `${baseUrl}?limit=50&offset=${offset}`;
            }
        }
        console.log(`\nTotal summary items: ${summaryList.length}`);

        // 2. Fetch details for each item in batches
        console.log("Step 2: Fetching details and inserting into DB...");

        // Clear DB first? Yes, to avoid duplicates or stale data.
        console.log("Clearing existing exercises...");
        await supabase.from("biblioteca_exercicios").delete().not("id", "is", null);

        const BATCH_SIZE = 10; // Concurrent requests

        // Helper to fetch detail
        const fetchDetail = async (id) => {
            try {
                const res = await fetch(`https://${MUSCLEWIKI_HOST}/exercises/${id}`, {
                    headers: {
                        "x-rapidapi-key": RAPIDAPI_KEY,
                        "x-rapidapi-host": MUSCLEWIKI_HOST,
                    }
                });
                if (!res.ok) return null;
                return await res.json();
            } catch (e) {
                return null;
            }
        };

        let processed = 0;
        let mappedBuffer = [];
        const INSERT_BATCH_SIZE = 50;

        for (let i = 0; i < summaryList.length; i += BATCH_SIZE) {
            const batchIds = summaryList.slice(i, i + BATCH_SIZE).map(item => item.id);

            // Fetch details in parallel
            const promises = batchIds.map(id => fetchDetail(id));
            const results = await Promise.all(promises);

            for (const detail of results) {
                if (!detail) continue;

                let videoUrl = null;
                if (detail.videos && detail.videos.length > 0) {
                    videoUrl = detail.videos[0].url;
                }

                mappedBuffer.push({
                    external_id: String(detail.id),
                    nome: detail.name,
                    body_part: detail.category,
                    target_muscle: (detail.primary_muscles && detail.primary_muscles.length > 0) ? detail.primary_muscles[0] : null,
                    equipment: (detail.category && detail.category !== "Bodyweight") ? detail.category : "bodyweight", // Approximate since 'equipment' field is missing in detail? Wait, category is usually equipment/type.
                    video_url: videoUrl,
                    instrucoes: detail.steps || [],
                });
            }

            processed += results.length;
            process.stdout.write(`\rFetched details: ${processed}/${summaryList.length}`);

            // Insert if buffer full
            if (mappedBuffer.length >= INSERT_BATCH_SIZE) {
                const { error } = await supabase.from("biblioteca_exercicios").insert(mappedBuffer);
                if (error) console.error("Insert error:", error);
                else mappedBuffer = []; // Clear buffer
            }

            // Small delay to be nice to API
            await new Promise(r => setTimeout(r, 200));
        }

        // Insert remaining
        if (mappedBuffer.length > 0) {
            const { error } = await supabase.from("biblioteca_exercicios").insert(mappedBuffer);
            if (error) console.error("Final insert error:", error);
        }

        console.log("\nSync complete!");

    } catch (err) {
        console.error("Sync failed:", err);
    }
}

runSync();
