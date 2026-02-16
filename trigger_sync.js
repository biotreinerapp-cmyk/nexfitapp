
const url = `${process.env.VITE_SUPABASE_URL}/functions/v1/sync-exercises`;
const headers = {
    'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};

const body = {
    apiKey: "7abffdb721mshe6edf9169775d83p1212ffjsn4c407842489b"
};

console.log("Triggering sync-exercises function with key...");
try {
    const response = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) });
    const text = await response.text();
    console.log('Status Code:', response.status);
    console.log('Full Response Body:', text);
} catch (error) {
    console.error("Fetch error:", error);
}
