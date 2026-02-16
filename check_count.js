
const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/biblioteca_exercicios?select=*&limit=1`;
const headers = {
    'apikey': process.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'count=exact',
    'Range': '0-0'
};

try {
    const response = await fetch(url, { method: 'GET', headers: headers });
    if (!response.ok) {
        console.log("Error fetching count:", response.status, response.statusText);
        process.exit(1);
    }
    const contentRange = response.headers.get('content-range');

    if (contentRange) {
        const total = contentRange.split('/')[1];
        console.log(`Total Exercises: ${total}`);
    } else {
        console.log('No Content-Range header found.');
    }

} catch (error) {
    console.error(error);
}
