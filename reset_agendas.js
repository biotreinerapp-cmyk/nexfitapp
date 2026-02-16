
import { createClient } from '@supabase/supabase-js';

// Retrying with User Provided Key
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || "https://afffyfsmcvphrhbtxrgt.supabase.co";

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Please set SUPABASE_SERVICE_ROLE_KEY env var");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

async function clearAgendas() {
    console.log("Clearing all agenda_treinos...");
    const { error, count } = await supabase
        .from("agenda_treinos")
        .delete()
        .not("id", "is", null);

    if (error) {
        console.error("Error clearing agendas:", error);
    } else {
        // count might be null depending on headers but usually works
        console.log("Agendas cleared. Rows affected (if returned):", count);
        console.log("Success! Users will have new routines generated on next visit.");
    }
}

clearAgendas();
