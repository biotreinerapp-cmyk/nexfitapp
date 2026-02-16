// Video cache utility for checking and loading cached exercise videos

let manifestCache: Record<string, string> | null = null;

export async function loadManifest(): Promise<Record<string, string>> {
    if (manifestCache) {
        return manifestCache;
    }

    try {
        const response = await fetch('/videos/exercises/manifest.json');
        if (!response.ok) {
            console.warn('Video manifest not found, cache unavailable');
            return {};
        }
        manifestCache = await response.json();
        return manifestCache;
    } catch (error) {
        console.error('Failed to load video manifest:', error);
        return {};
    }
}

export async function getCachedVideoUrl(exerciseId: string): Promise<string | null> {
    const manifest = await loadManifest();
    const filename = manifest[exerciseId];

    if (!filename) {
        return null;
    }

    return `/videos/exercises/${filename}`;
}

export async function isVideoCached(exerciseId: string): Promise<boolean> {
    const manifest = await loadManifest();
    return exerciseId in manifest;
}
