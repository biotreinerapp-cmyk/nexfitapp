
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share, PlusSquare } from "lucide-react";

interface IOSInstallModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const IOSInstallModal = ({ open, onOpenChange }: IOSInstallModalProps) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xs border border-white/10 bg-black/90 backdrop-blur-2xl text-foreground sm:rounded-3xl">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-lg font-black uppercase tracking-tight text-white text-center">
                        Instalar no iOS
                    </DialogTitle>
                    <DialogDescription className="text-xs text-center text-muted-foreground">
                        Siga os passos abaixo para adicionar o Nexfit à sua tela inicial.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-500">
                            <Share className="h-5 w-5" />
                        </div>
                        <p className="text-xs text-white">
                            1. Toque no botão <span className="font-bold text-blue-400">Compartilhar</span> na barra inferior do Safari.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white">
                            <PlusSquare className="h-5 w-5" />
                        </div>
                        <p className="text-xs text-white">
                            2. Role para cima e selecione <span className="font-bold text-white">Adicionar à Tela de Início</span>.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        className="w-full rounded-xl bg-primary text-black font-bold uppercase tracking-widest hover:bg-primary/90"
                        onClick={() => onOpenChange(false)}
                    >
                        Entendi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
