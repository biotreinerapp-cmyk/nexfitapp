
const url = "https://musclewiki-api.p.rapidapi.com/exercises?limit=50";
const headers = {
    "x-rapidapi-key": "7abffdb721mshe6edf9169775d83p1212ffjsn4c407842489b",
    "x-rapidapi-host": "musclewiki-api.p.rapidapi.com"
};

console.log(`Fetching from ${url}...`);

try {
    const response = await fetch(url, { method: 'GET', headers: headers });
    console.log('Status Code:', response.status);

    if (!response.ok) {
        const text = await response.text();
        console.log('Error Body:', text);
    } else {
        const data = await response.json();
        if (Array.isArray(data)) {
            console.log(`Received array with ${data.length} items`);
        } else {
            console.log('Received object keys:', Object.keys(data));
            if (data.results) {
                console.log(`Results count: ${data.results.length}`);
                if (data.results.length > 0) {
                    console.log('First item keys:', Object.keys(data.results[0]));
                    console.log('First item full:', JSON.stringify(data.results[0]));
                }
            }
            if (data.next) console.log(`Next URL: ${data.next}`);
        }
    }

} catch (error) {
    console.error(error);
}
