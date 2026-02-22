import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import slugify from 'slugify';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminhos Locais
const ASSETS_DIR = path.resolve(__dirname, '../public/assets/exercises');
const SQL_OUTPUT_PATH = path.resolve(__dirname, 'seed_wikihow_exercises.sql');
const JSON_META_PATH = path.resolve(ASSETS_DIR, 'metadata.json');

// Termos específicos para busca direta e categorias
const SEED_URLS = [
    'https://pt.wikihow.com/Categoria:Malha%C3%A7%C3%A3o',
    'https://pt.wikihow.com/Categoria:Academia',
    'https://pt.wikihow.com/Categoria:Educa%C3%A7%C3%A3o-F%C3%ADsica',
    'https://pt.wikihow.com/Especial:Busca?search=supino',
    'https://pt.wikihow.com/Especial:Busca?search=halteres',
    'https://pt.wikihow.com/Especial:Busca?search=rosca+direta',
    'https://pt.wikihow.com/Especial:Busca?search=leg+press',
    'https://pt.wikihow.com/Especial:Busca?search=agachamento',
    'https://pt.wikihow.com/Especial:Busca?search=levantamento+terra',
    'https://pt.wikihow.com/Especial:Busca?search=triceps+pulley',
    'https://pt.wikihow.com/Especial:Busca?search=remada+baixa',
    'https://pt.wikihow.com/Especial:Busca?search=desenvolvimento+ombros'
];

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function downloadMedia(url, filename) {
    const filePath = path.join(ASSETS_DIR, filename);
    if (fs.existsSync(filePath)) return filePath;
    try {
        const response = await axios({ method: 'GET', url, responseType: 'stream', headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(filePath));
            writer.on('error', reject);
        });
    } catch (e) { return null; }
}

async function getLinksFromPage(url) {
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        const articles = [];
        const categories = [];
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href && href.startsWith('https://pt.wikihow.com/')) {
                const cleanLink = href.split('#')[0];
                if (cleanLink.includes('/Categoria:')) categories.push(cleanLink);
                else if (!cleanLink.includes('/Especial:') && !cleanLink.includes('/wikiHow:') && cleanLink.length > 25) articles.push(cleanLink);
            }
        });
        return { articles, categories };
    } catch (e) { return { articles: [], categories: [] }; }
}

async function scrapeArticle(url) {
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        let title = $('#section_0 a').first().text().trim() || $('h1.firstHeading').first().text().trim();
        if (title.toLowerCase().startsWith('como ')) title = title.substring(5).trim();
        if (!title || title.length < 3) return null;

        const titleLower = title.toLowerCase();
        const ignoreKeywords = ['jogar', 'sinuca', 'bilhar', 'jangada', 'ninja', 'vôlei', 'basquete', 'futebol', 'beisebol', 'badminton', 'pescar', 'caçar', 'consertar', 'limpar', 'comprar', 'vestir', 'dieta', 'comer', 'beber', 'dormir', 'mental', 'psicologia', 'meditar', 'esfaqueado', 'curar', 'ferimento', 'escolher', 'tornado', 'furacão'];
        if (ignoreKeywords.some(k => titleLower.includes(k))) return null;

        const gymKeywords = ['treino', 'exercício', 'músculo', 'academia', 'barra', 'haltere', 'peso', 'série', 'repetição', 'malhar', 'agachamento', 'flexão', 'abdominais', 'bíceps', 'tríceps', 'peitoral', 'costas', 'pernas', 'glúteos', 'panturrilha', 'ombros', 'supino', 'levantamento', 'remada', 'puxada', 'estocada', 'prancha', 'cardio', 'esteira', 'eliptico', 'crossover', 'leg press', 'rosca', 'stiff', 'afundo'];
        const contentText = $('body').text().toLowerCase();
        if (!gymKeywords.some(k => titleLower.includes(k) || contentText.includes(k))) return null;

        const instructions = [];
        $('.step').each((i, el) => {
            $(el).find('sup').remove();
            let stepText = $(el).clone().children('b').first().text().trim() || $(el).text().split('\n')[0].trim();
            const cleanText = stepText.replace(/^[0-9]+[.)\s]+/, '').trim();
            if (cleanText && cleanText.length > 5) instructions.push(cleanText);
        });
        if (instructions.length === 0) return null;

        let mediaUrl = null;
        const videoSource = $('video source[type="video/mp4"]').first().attr('src');
        const gifSource = $('img.animated-gif').first().attr('data-src') || $('img.animated-gif').first().attr('src');
        const mainImage = $('.section_text img').first().attr('data-src') || $('.section_text img').first().attr('src');
        if (videoSource) mediaUrl = videoSource.startsWith('//') ? 'https:' + videoSource : videoSource;
        else if (gifSource) mediaUrl = gifSource.startsWith('//') ? 'https:' + gifSource : gifSource;
        else if (mainImage) mediaUrl = mainImage.startsWith('//') ? 'https:' + mainImage : mainImage;
        if (!mediaUrl || mediaUrl.includes('logo') || mediaUrl.includes('SVG')) return null;

        const slug = slugify(title, { lower: true, strict: true });
        const ext = mediaUrl.toLowerCase().includes('.mp4') ? '.mp4' : (mediaUrl.toLowerCase().includes('.gif') ? '.gif' : '.jpg');
        const filename = `${slug}-wikihow${ext}`;
        const downloadedPath = await downloadMedia(mediaUrl, filename);
        if (!downloadedPath) return null;

        return { nome: title, video_url: `/assets/exercises/${filename}`, instrucoes: instructions, body_part: 'Geral', target_muscle: 'Geral', equipment: 'Geral' };
    } catch (e) { return null; }
}

async function runScraper() {
    console.log("Iniciando Descoberta Ultra-Focada (Meta: 200)...");
    let queue = [...SEED_URLS];
    let processedPages = new Set();
    let discoveredArticles = new Set();
    const limit = 200;

    while (queue.length > 0 && discoveredArticles.size < limit * 4) {
        const url = queue.shift();
        if (processedPages.has(url)) continue;
        processedPages.add(url);
        console.log(`Explorando: ${url}`);
        const { articles, categories } = await getLinksFromPage(url);
        articles.forEach(a => discoveredArticles.add(a));
        categories.forEach(c => { if (!processedPages.has(c)) queue.push(c); });
        await delay(1000);
    }

    const results = [];
    const articleList = Array.from(discoveredArticles);
    console.log(`Fase de descoberta finalizada. Links para processar: ${articleList.length}`);

    for (const url of articleList) {
        const data = await scrapeArticle(url);
        if (data) {
            results.push(data);
            process.stdout.write(`\r[Coletados: ${results.length}/${limit}] `);
        }
        if (results.length >= limit) break;
        await delay(800);
    }

    if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });
    fs.writeFileSync(JSON_META_PATH, JSON.stringify(results, null, 2), 'utf8');
    let sql = `-- Seed massivo wikiHow Gym Final\n\n`;
    for (const ex of results) {
        const nomeSql = ex.nome.replace(/'/g, "''");
        let instructionArrayParams = ex.instrucoes.map(i => `'${i.replace(/'/g, "''")}'`).join(", ");
        sql += `INSERT INTO public.biblioteca_exercicios (nome, body_part, target_muscle, equipment, video_url, instrucoes) VALUES ('${nomeSql}', 'Geral', 'Geral', 'Geral', '${ex.video_url}', ARRAY[${instructionArrayParams}]);\n`;
    }
    fs.writeFileSync(SQL_OUTPUT_PATH, sql, 'utf8');
    console.log(`\nFinalizado com ${results.length} exercícios.`);
}
runScraper();
