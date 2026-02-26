import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";

/**
 * Badge flutuante que aparece no topo da tela quando o app está offline.
 * Usa useConnectionStatus com silent=true para não duplicar o toast global.
 */
export const OfflineBadge = () => {
    const { isOnline } = useConnectionStatus({ silent: true });

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    key="offline-badge"
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="fixed top-0 left-0 right-0 z-[9998] flex items-center justify-center gap-2 bg-amber-500/95 backdrop-blur-md py-1.5 px-4 shadow-lg"
                >
                    <WifiOff className="h-3.5 w-3.5 text-black shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-black">
                        Modo Offline — Dados salvos localmente
                    </span>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
