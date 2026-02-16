
const url = "https://musclewiki-api.p.rapidapi.com/exercises/10";
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
        console.log('Data keys:', Object.keys(data));
        console.log('Data sample:', JSON.stringify(data, null, 2));
    }

} catch (error) {
    console.error(error);
}
