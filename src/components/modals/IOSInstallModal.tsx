
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
                <DialogHeader className="pb-4">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight text-white text-center">
                        Instalar Nexfit
                    </DialogTitle>
                    <DialogDescription className="text-xs text-center text-muted-foreground">
                        Adicione o app à sua tela de início para ter a melhor experiência.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3 py-2">
                    <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/[0.07]">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                            <Share className="h-6 w-6" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Passo 1</p>
                            <p className="text-xs text-white leading-snug">
                                Toque no botão <span className="font-bold text-white">Compartilhar</span> na barra inferior.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/[0.07]">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                            <PlusSquare className="h-6 w-6" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Passo 2</p>
                            <p className="text-xs text-white leading-snug">
                                Selecione <span className="font-bold text-white">Adicionar à Tela de Início</span>.
                            </p>
                        </div>
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
