
import { useEffect, useState, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCachedVideoUrl } from "@/lib/videoCache";
import defaultExerciseImage from "@/assets/default-exercise.png";

interface SecureVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
    src: string;
    apiKey: string;
    exerciseId?: string; // Optional: for cache lookup
}

export function SecureVideo({ src, apiKey, exerciseId, className, ...props }: SecureVideoProps) {
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!src) return;

        // Check if it's a blob url already
        if (src.startsWith('blob:')) {
            setVideoSrc(src);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const loadVideo = async () => {
            // First, try to load from local cache if exerciseId is provided
            if (exerciseId) {
                try {
                    const cachedUrl = await getCachedVideoUrl(exerciseId);
                    if (cachedUrl) {
                        console.log(`Using cached video for exercise ${exerciseId}`);
                        setVideoSrc(cachedUrl);
                        setLoading(false);
                        return;
                    }
                } catch (err) {
                    console.warn('Cache lookup failed, falling back to API:', err);
                }
            }

            // If not in cache or no exerciseId, try API
            if (!src.includes('rapidapi')) {
                // Not a protected URL, use directly
                setVideoSrc(src);
                setLoading(false);
                return;
            }

            // Fetch from API with authentication
            const controller = new AbortController();
            abortControllerRef.current = controller;

            try {
                const response = await fetch(src, {
                    headers: {
                        "x-rapidapi-key": apiKey,
                        "x-rapidapi-host": "musclewiki-api.p.rapidapi.com",
                    },
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const text = await response.text().catch(() => "No error body");
                    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 50)}`);
                }

                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                setVideoSrc(objectUrl);
                setLoading(false);
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error("Error fetching secure video:", err);
                    setError(err.message || "Unknown error");
                    setLoading(false);
                }
            }
        };

        loadVideo();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (videoSrc && videoSrc.startsWith('blob:')) {
                URL.revokeObjectURL(videoSrc);
            }
        };
    }, [src, apiKey, exerciseId]);

    if (error) {
        // Show placeholder image for any error (API quota, network, etc.)
        return (
            <div className={`relative ${className}`}>
                <img
                    src={defaultExerciseImage}
                    alt="Demonstração do exercício"
                    className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 text-center">
                    Vídeo indisponível
                </div>
            </div>
        );
    }

    if (loading) {
        return <Skeleton className={`animate-pulse ${className}`} />;
    }

    return (
        <video
            src={videoSrc!}
            className={className}
            {...props}
        />
    );
}
