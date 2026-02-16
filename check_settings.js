
const url = "https://afffyfsmcvphrhbtxrgt.supabase.co/rest/v1/app_settings?select=*";
const headers = {
    'apikey': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZmZ5ZnNtY3ZwaHJoYnR4cmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNjU1NDYsImV4cCI6MjA4MjY0MTU0Nn0.cpLjvUADTJxzdr0MGIZFai_zYHPbnaU2P1I-EyDoqnw",
    'Authorization': "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZmZ5ZnNtY3ZwaHJoYnR4cmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNjU1NDYsImV4cCI6MjA4MjY0MTU0Nn0.cpLjvUADTJxzdr0MGIZFai_zYHPbnaU2P1I-EyDoqnw",
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
