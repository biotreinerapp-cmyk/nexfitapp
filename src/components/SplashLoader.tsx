import { motion } from "framer-motion";
import logoNexfit from "@/assets/nexfit-logo.png";

const SplashLoader = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505]">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/20 rounded-full blur-[100px] animate-pulse" />

            <div className="relative flex flex-col items-center">
                {/* Animated Logo */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative mb-6"
                >
                    <img
                        src={logoNexfit}
                        alt="Nexfit"
                        className="h-20 w-auto object-contain drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                    />
                </motion.div>

                {/* Loading Text / Branding */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="flex flex-col items-center gap-2"
                >
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/60">
                        NEXFIT SYSTEM
                    </p>

                    {/* Suttle Progress Line */}
                    <div className="h-[2px] w-24 bg-white/5 rounded-full overflow-hidden mt-4">
                        <motion.div
                            className="h-full bg-primary"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                    </div>
                </motion.div>
            </div>

            {/* Footer Branding */}
            <div className="absolute bottom-10 text-[8px] font-bold text-white/20 uppercase tracking-[0.3em]">
                Elite Performance Intelligence
            </div>
        </div>
    );
};

export default SplashLoader;
