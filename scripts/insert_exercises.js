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
const JSON_META_PATH = path.resolve(__dirname, '../public/assets/exercises/metadata.json');

async function insertExercises() {
    try {
        if (!fs.existsSync(JSON_META_PATH)) {
            console.error("Erro: metadata.json não encontrado.");
            process.exit(1);
        }

        const exercises = JSON.parse(fs.readFileSync(JSON_META_PATH, 'utf8'));
        console.log(`Lendo ${exercises.length} exercícios...`);

        // 1. Limpar agenda_treinos (depende da biblioteca)
        console.log("Limpando agenda_treinos...");
        await supabase.from('agenda_treinos').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // 2. Limpar biblioteca_exercicios para evitar duplicatas sem constraint UNIQUE
        console.log("Limpando biblioteca_exercicios para carga limpa...");
        await supabase.from('biblioteca_exercicios').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // 3. Inserir em lotes de 50 para evitar limites de payload
        const batchSize = 50;
        for (let i = 0; i < exercises.length; i += batchSize) {
            const batch = exercises.slice(i, i + batchSize).map(ex => ({
                nome: ex.nome,
                video_url: ex.video_url,
                instrucoes: ex.instrucoes,
                body_part: ex.body_part || 'Geral',
                target_muscle: ex.target_muscle || 'Geral',
                equipment: ex.equipment || 'Geral'
            }));

            console.log(`Inserindo lote ${Math.floor(i / batchSize) + 1}...`);
            const { error } = await supabase.from('biblioteca_exercicios').insert(batch);
            if (error) throw error;
        }

        console.log(`Sucesso! ${exercises.length} exercícios carregados.`);
        const { count } = await supabase.from('biblioteca_exercicios').select('*', { count: 'exact', head: true });
        console.log(`Total final: ${count} exercícios.`);

    } catch (e) {
        console.error("Erro fatal:", e.message);
        process.exit(1);
    }
}
insertExercises();
