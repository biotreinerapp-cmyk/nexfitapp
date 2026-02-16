
const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/app_settings?select=*`;
const headers = {
    'apikey': process.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};

try {
    const response = await fetch(url, { method: 'GET', headers: headers });
    if (!response.ok) {
        console.log("Error fetching settings:", response.status, response.statusText);
        process.exit(1);
    }
    const data = await response.json();
    console.log("Settings found:", data);

} catch (error) {
    console.error(error);
}
