import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface SpotifyButtonProps {
    className?: string;
    variant?: "icon" | "full";
}

const SpotifyIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        className={cn("fill-current", className)}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.49 17.303c-.215.353-.673.465-1.026.25-2.85-1.742-6.438-2.136-10.663-1.17a.754.754 0 0 1-.926-.514.755.755 0 0 1 .514-.926c4.62-1.057 8.583-.604 11.85 1.393.353.215.465.673.25 1.027zm1.464-3.26c-.27.44-.847.583-1.287.313-3.262-2.003-8.235-2.585-12.093-1.413-.497.15-1.023-.13-1.174-.627s.13-1.023.627-1.174c4.417-1.34 9.904-.68 13.614 1.6 0 .44-.847.583-1.287.313zm.136-3.41c-3.91-2.322-10.366-2.535-14.126-1.393a.936.936 0 0 1-1.164-.625.937.937 0 0 1 .625-1.164c4.32-1.31 11.453-1.058 15.976 1.623.51.303.676.96.372 1.47a.933.933 0 0 1-1.373.303l-.31-.184z" />
    </svg>
);

export const SpotifyButton = ({ className, variant = "icon" }: SpotifyButtonProps) => {
    const { toast } = useToast();

    const handleOpenSpotify = () => {
        const spotifyUri = "spotify:open";
        const spotifyWeb = "https://open.spotify.com";

        // Tentativa de abrir o app
        window.location.href = spotifyUri;

        // Fallback para web após um pequeno delay se o app não abrir
        // Nota: Em browsers modernos, isso pode não funcionar perfeitamente,
        // mas é o padrão para deep linking simples.
        setTimeout(() => {
            if (document.hasFocus()) {
                toast({
                    title: "Abrindo Spotify",
                    description: "Redirecionando para o player web...",
                });
                window.open(spotifyWeb, "_blank");
            }
        }, 500);
    };

    if (variant === "full") {
        return (
            <Button
                onClick={handleOpenSpotify}
                className={cn(
                    "flex items-center gap-2 rounded-2xl bg-[#1DB954] font-black text-black hover:bg-[#1ed760] transition-all active:scale-95",
                    className
                )}
            >
                <SpotifyIcon className="h-5 w-5" />
                <span className="uppercase tracking-widest text-[10px]">Abrir Spotify</span>
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenSpotify}
            className={cn(
                "h-10 w-10 rounded-2xl bg-[#1DB954]/10 text-[#1DB954] border border-[#1DB954]/20 hover:bg-[#1DB954]/20 transition-all active:scale-90",
                className
            )}
        >
            <SpotifyIcon className="h-5 w-5" />
        </Button>
    );
};
