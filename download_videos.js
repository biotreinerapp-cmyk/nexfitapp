import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// RapidAPI configuration
const RAPIDAPI_KEY = '7abffdb721mshe6edf9169775d83p1212ffjsn4c407842489b';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const OUTPUT_DIR = path.join(__dirname, 'public', 'videos', 'exercises');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function downloadVideo(url, outputPath) {
    try {
        const response = await fetch(url, {
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': 'musclewiki-api.p.rapidapi.com'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        fs.writeFileSync(outputPath, Buffer.from(buffer));
        return true;
    } catch (error) {
        console.error(`Failed to download ${url}:`, error.message);
        return false;
    }
}

async function getTopExercises(limit = 50) {
    // Get exercises that are most commonly used in user routines
    const { data, error } = await supabase
        .from('biblioteca_exercicios')
        .select('id, nome, video_url')
        .not('video_url', 'is', null)
        .limit(limit);

    if (error) {
        console.error('Error fetching exercises:', error);
        return [];
    }

    return data || [];
}

async function main() {
    console.log('🎬 Starting video download process...\n');

    // Get top exercises
    console.log('📋 Fetching top exercises from database...');
    const exercises = await getTopExercises(50);
    console.log(`Found ${exercises.length} exercises with videos\n`);

    const manifest = {};
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i];
        const progress = `[${i + 1}/${exercises.length}]`;

        console.log(`${progress} ${exercise.nome || 'Unnamed'}`);

        if (!exercise.video_url) {
            console.log(`  ⚠️  No video URL, skipping\n`);
            failCount++;
            continue;
        }

        // Generate filename from exercise ID
        const filename = `${exercise.id}.mp4`;
        const outputPath = path.join(OUTPUT_DIR, filename);

        // Skip if already downloaded
        if (fs.existsSync(outputPath)) {
            console.log(`  ✓ Already cached`);
            manifest[exercise.id] = filename;
            successCount++;
            continue;
        }

        // Download video
        console.log(`  ⬇️  Downloading...`);
        const success = await downloadVideo(exercise.video_url, outputPath);

        if (success) {
            const stats = fs.statSync(outputPath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`  ✓ Downloaded (${sizeMB} MB)`);
            manifest[exercise.id] = filename;
            successCount++;
        } else {
            console.log(`  ✗ Failed`);
            failCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Save manifest
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`\n📄 Manifest saved to ${MANIFEST_PATH}`);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Download Summary:');
    console.log(`  ✓ Success: ${successCount}`);
    console.log(`  ✗ Failed:  ${failCount}`);
    console.log(`  📁 Total:  ${exercises.length}`);
    console.log('='.repeat(50));
}

main().catch(console.error);
