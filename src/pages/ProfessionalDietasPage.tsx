import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ProfessionalFloatingNavIsland } from "@/components/navigation/ProfessionalFloatingNavIsland";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { Plus, Apple, Pencil, Trash2, Send, Loader2, Search, Calendar, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type Template = {
    id: string;
    name: string;
    description: string | null;
    days: any[];
    updated_at: string;
};

type Student = {
    id: string;
    display_name: string;
    user_id: string;
};

export default function ProfessionalDietasPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [sendTemplate, setSendTemplate] = useState<Template | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [sending, setSending] = useState(false);
    const [proId, setProId] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!user) return;

            try {
                // Get professional ID
                const { data: pro } = await supabase
                    .from("professionals")
                    .select("id")
                    .eq("user_id", user.id)
                    .single();

                if (pro) {
                    setProId(pro.id);

                    // Get templates from nutrition_plans
                    const { data: tData, error: tError } = await (supabase as any)
                        .from("nutrition_plans")
                        .select("*")
                        .eq("user_id", user.id)
                        .eq("is_template", true)
                        .order("updated_at", { ascending: false });

                    if (tError) throw tError;
                    setTemplates((tData || []) as Template[]);

                    // Get students (hires)
                    const { data: hData, error: hError } = await supabase
                        .from("professional_hires")
                        .select(`
                            student_id,
                            profiles:profiles!professional_hires_student_id_fkey(id, display_name)
                        `)
                        .eq("professional_id", pro.id)
                        .eq("status", "accepted");

                    if (hError) {
                        console.error("Error loading students:", hError);
                    } else if (hData) {
                        const sList = (hData as any[]).map(h => ({
                            id: h.profiles.id,
                            display_name: h.profiles.display_name,
                            user_id: h.student_id
                        }));
                        setStudents(sList);
                    }
                }
            } catch (error) {
                console.error("Error loading templates:", error);
                toast({ title: "Erro ao carregar dados", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user, toast]);

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            const { error } = await (supabase as any)
                .from("nutrition_plans")
                .delete()
                .eq("id", deleteId);

            if (error) throw error;

            setTemplates(prev => prev.filter(t => t.id !== deleteId));
            toast({ title: "Template excluído com sucesso" });
        } catch (error) {
            toast({ title: "Erro ao excluir template", variant: "destructive" });
        } finally {
            setDeleteId(null);
        }
    };

    const handleSend = async (studentUserId: string) => {
        if (!sendTemplate || !proId) return;
        setSending(true);
        try {
            const { error } = await (supabase as any)
                .from("nutrition_plans")
                .insert({
                    user_id: studentUserId,
                    name: sendTemplate.name,
                    description: sendTemplate.description,
                    days: sendTemplate.days,
                    is_template: false,
                    professional_creator_id: proId,
                    is_active: true
                });

            if (error) throw error;

            toast({
                title: "Plano alimentar enviado!",
                description: "O aluno já pode visualizar em seu app."
            });
            setSendTemplate(null);
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao enviar plano", variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black pb-28 safe-bottom-floating-nav">
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BackIconButton to="/professional/dashboard" />
                        <h1 className="text-xl font-black uppercase tracking-tight text-white italic">
                            Minhas Dietas
                        </h1>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => navigate("/professional/dietas/nova")}
                        className="bg-primary text-black font-black uppercase text-[10px] h-8 rounded-xl hover:bg-primary/90"
                    >
                        <Plus className="mr-1 h-3 w-3" /> Nova
                    </Button>
                </div>
            </div>

            <section className="px-4 py-8 space-y-6 max-w-lg mx-auto">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <input
                        placeholder="Buscar plano alimentar ou receita..."
                        className="w-full h-14 pl-12 bg-white/5 border border-white/10 text-white rounded-2xl focus:border-primary/50 transition-all outline-none"
                    />
                </div>

                {templates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                        <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Apple className="h-10 w-10 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Crie sua Biblioteca</h2>
                            <p className="text-sm text-zinc-500 max-w-[280px] mx-auto">
                                Monte modelos de planos alimentares e receitas para prescrever rapidamente para seus alunos.
                            </p>
                        </div>
                        <Button
                            onClick={() => navigate("/professional/dietas/nova")}
                            className="bg-primary text-black font-black uppercase rounded-2xl h-12 px-8 hover:bg-primary/90"
                        >
                            Criar Primeiro Modelo
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Seus Modelos</h2>
                        {templates.map(t => (
                            <div
                                key={t.id}
                                className="group relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] backdrop-blur-md hover:border-white/10 transition-all"
                            >
                                <div className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <h3 className="font-black text-white uppercase italic tracking-tight">{t.name}</h3>
                                            <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {t.days?.length || 0} dias
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Zap className="h-3 w-3" />
                                                    {format(new Date(t.updated_at), "dd/MM", { locale: ptBR })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 rounded-xl text-zinc-500 hover:text-white"
                                                onClick={() => navigate(`/professional/dietas/${t.id}`)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 rounded-xl text-zinc-500 hover:text-red-400"
                                                onClick={() => setDeleteId(t.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => setSendTemplate(t)}
                                        className="w-full mt-4 bg-white/5 border border-white/10 hover:bg-primary hover:text-black hover:border-transparent text-white text-[10px] font-black uppercase h-10 rounded-xl gap-2 transition-all"
                                    >
                                        <Send className="h-3 w-3" /> Enviar para Aluno
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent className="bg-zinc-900 border-white/10 text-white rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-black uppercase italic">Excluir template?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                            Essa ação não pode ser desfeita. O modelo será removido permanentemente de sua biblioteca.
                            Alunos que já receberam este plano não serão afetados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-red-500 text-white hover:bg-red-600 font-bold"
                            onClick={handleDelete}
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!sendTemplate} onOpenChange={(o) => !o && setSendTemplate(null)}>
                <DialogContent className="bg-zinc-900 border-white/10 text-white rounded-3xl max-w-[90vw] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase italic">
                            Enviar Plano Alimentar
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Selecione o aluno que receberá o plano alimentar atualizado. Isso definirá o plano como ativo para o aluno.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 max-h-[40vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {students.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="h-10 w-10 text-zinc-700 mx-auto mb-2" />
                                <p className="text-sm text-zinc-500">Nenhum aluno ativo encontrado.</p>
                                <Button
                                    variant="link"
                                    className="text-primary text-[10px] uppercase font-black"
                                    onClick={() => navigate("/professional/consultoria")}
                                >
                                    Ir para Minha Consultoria
                                </Button>
                            </div>
                        ) : (
                            students.map(student => (
                                <button
                                    key={student.id}
                                    disabled={sending}
                                    onClick={() => handleSend(student.user_id)}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 hover:bg-white/10 transition-all text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                            {student.display_name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-white">{student.display_name}</p>
                                            <p className="text-[10px] text-zinc-500 font-medium italic">Aluno Ativo</p>
                                        </div>
                                    </div>
                                    <Send className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <ProfessionalFloatingNavIsland />
        </main>
    );
}
