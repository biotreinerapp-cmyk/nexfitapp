import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
    const envPath = path.resolve(__dirname, '../.env');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim();
        }
    });
}
loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Erro: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sync() {
    try {
        console.log("Fetching from biblioteca_exercicios...");
        const { data: bibData, error: bibError } = await supabase.from('biblioteca_exercicios').select('*');
        if (bibError) throw bibError;

        console.log(`Found ${bibData.length} exercises. Syncing to 'exercises' table...`);

        // Clean exercises table first to avoid duplicates and ensure a fresh sync from the scraper data
        console.log("Cleaning 'exercises' table...");
        await supabase.from('exercises').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        const exercisesToInsert = bibData.map(ex => ({
            name: ex.nome,
            target_muscle: ex.target_muscle || 'Geral',
            equipment: ex.equipment || 'Geral',
            difficulty: 'Iniciante',
            video_url: ex.video_url,
            is_active: true
        }));

        const batchSize = 50;
        for (let i = 0; i < exercisesToInsert.length; i += batchSize) {
            const batch = exercisesToInsert.slice(i, i + batchSize);
            console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}...`);
            const { error } = await supabase.from('exercises').insert(batch);
            if (error) throw error;
        }

        const { count } = await supabase.from('exercises').select('*', { count: 'exact', head: true });
        console.log(`Sync completed successfully! Total in 'exercises': ${count}`);
    } catch (e) {
        console.error("Erro fatal:", e.message);
        process.exit(1);
    }
}

sync();
