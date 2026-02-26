import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
    Dumbbell,
    ActivitySquare,
    Flame,
    Store,
    Stethoscope,
    Zap,
    Trophy
} from "lucide-react";

const LoaderIcons = [
    { icon: Dumbbell, color: "text-emerald-400" },
    { icon: ActivitySquare, color: "text-blue-400" },
    { icon: Flame, color: "text-amber-400" },
    { icon: Zap, color: "text-yellow-400" },
    { icon: Store, color: "text-purple-400" },
    { icon: Stethoscope, color: "text-rose-400" },
    { icon: Trophy, color: "text-amber-300" }
];

const SplashLoader = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % LoaderIcons.length);
        }, 400); // Change icon every 0.4s
        return () => clearInterval(interval);
    }, []);

    const CurrentIcon = LoaderIcons[currentIndex].icon;
    const currentColor = LoaderIcons[currentIndex].color;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505] overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[100px] animate-pulse" />

            <div className="relative flex flex-col items-center gap-8">
                {/* Glassmorphic Icon Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="relative w-24 h-24 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden ring-1 ring-white/5"
                >
                    {/* Inner highlight */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, scale: 0.5, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.5, y: -10 }}
                            transition={{ duration: 0.15, ease: "easeInOut" }}
                            className="relative z-10"
                        >
                            <CurrentIcon className={`w-10 h-10 ${currentColor} drop-shadow-[0_0_10px_currentColor]`} strokeWidth={1.5} />
                        </motion.div>
                    </AnimatePresence>
                </motion.div>

                {/* Suttle Progress Line */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="h-[2px] w-32 bg-white/5 rounded-full overflow-hidden"
                >
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </motion.div>
            </div>
        </div>
    );
};

export default SplashLoader;
