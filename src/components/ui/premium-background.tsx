
// Helper component for the premium background
import { cn } from "@/lib/utils";

interface PremiumBackgroundProps {
    children: React.ReactNode;
    className?: string;
}

export const PremiumBackground = ({ children, className }: PremiumBackgroundProps) => {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-black font-sans text-foreground antialiased selection:bg-primary/30 selection:text-white">
            {/* Background Image / Gradient */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-black via-black/90 to-black/80 z-10" />
                {/* We will place the generated image here eventually, for now using a subtle pattern/gradient */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-900/20 via-black to-black opacity-70" />
            </div>

            {/* Content */}
            <div className={cn("relative z-20 flex min-h-screen flex-col items-center justify-center p-4", className)}>
                {children}
            </div>
        </div>
    );
};
