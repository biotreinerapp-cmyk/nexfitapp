
const filename = "male-kettlebell-concentration-curl-front.mp4";
const candidates = [
    `https://musclewiki.com/media/videos/branded/${filename}`,
    `https://musclewiki.com/media/uploads/videos/branded/${filename}`,
    `https://media.musclewiki.com/videos/branded/${filename}`,
    `https://musclewiki-api.p.rapidapi.com/media/videos/branded/${filename}`, // Original (protected)
];

async function checkUrl(url) {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        console.log(`[${res.status}] ${url}`);
        if (res.ok) return true;
    } catch (e) {
        console.log(`[ERR] ${url}: ${e.message}`);
    }
    return false;
}

async function run() {
    console.log("Testing public URLs...");
    for (const url of candidates) {
        await checkUrl(url);
    }
}

run();
