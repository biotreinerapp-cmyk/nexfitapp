
const url = "https://afffyfsmcvphrhbtxrgt.supabase.co/functions/v1/sync-exercises";
const headers = {
    'Authorization': "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZmZ5ZnNtY3ZwaHJoYnR4cmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNjU1NDYsImV4cCI6MjA4MjY0MTU0Nn0.cpLjvUADTJxzdr0MGIZFai_zYHPbnaU2P1I-EyDoqnw",
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
