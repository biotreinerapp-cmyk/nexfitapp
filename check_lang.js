
const url = "https://musclewiki-api.p.rapidapi.com/exercises?limit=1&language=pt";
const headers = {
    "x-rapidapi-key": "7abffdb721mshe6edf9169775d83p1212ffjsn4c407842489b",
    "x-rapidapi-host": "musclewiki-api.p.rapidapi.com"
};

console.log(`Fetching from ${url}...`);

try {
    const response = await fetch(url, { method: 'GET', headers: headers });
    console.log('Status Code:', response.status);

    const data = await response.json();
    if (data.results && data.results.length > 0) {
        console.log("Sample:", JSON.stringify(data.results[0], null, 2));
    } else {
        console.log("No results or empty.");
    }

} catch (error) {
    console.error(error);
}
