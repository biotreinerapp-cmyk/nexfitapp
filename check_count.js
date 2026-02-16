
const url = "https://afffyfsmcvphrhbtxrgt.supabase.co/rest/v1/biblioteca_exercicios?select=*&limit=1";
const headers = {
    'apikey': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZmZ5ZnNtY3ZwaHJoYnR4cmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNjU1NDYsImV4cCI6MjA4MjY0MTU0Nn0.cpLjvUADTJxzdr0MGIZFai_zYHPbnaU2P1I-EyDoqnw",
    'Authorization': "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZmZ5ZnNtY3ZwaHJoYnR4cmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNjU1NDYsImV4cCI6MjA4MjY0MTU0Nn0.cpLjvUADTJxzdr0MGIZFai_zYHPbnaU2P1I-EyDoqnw",
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
