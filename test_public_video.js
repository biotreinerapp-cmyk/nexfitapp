
const testUrl = "https://musclewiki.com/media/videos/branded/male-kettlebell-concentration-curl-front.mp4";

console.log(`Testing public video URL: ${testUrl}`);

try {
    const response = await fetch(testUrl);
    console.log(`Status code: ${response.status}`);

    if (response.ok) {
        console.log("Success! Video is public on main domain.");
    } else {
        console.log("Failed. Access denied or not found.");
    }
} catch (err) {
    console.error("Fetch failed:", err);
}
