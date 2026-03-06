import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus,
    Pencil,
    Trash2,
    ChevronRight,
    Lock,
    Utensils,
    Apple,
    Flame,
    ClipboardList,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type NutritionPlan = {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    days: any[];
    created_at: string;
    updated_at: string;
    professional_creator_id: string | null;
};

function getTotalMeals(days: any[]): number {
    return (days ?? []).reduce((acc, d) => acc + (d.items?.length ?? 0), 0);
}

function getTotalCalories(days: any[]): number {
    return (days ?? []).reduce((acc, d) => {
        return acc + (d.items?.reduce((sum: number, item: any) => sum + (Number(item.calories) || 0), 0) ?? 0);
    }, 0);
}

export default function PlanoAlimentarPage() {
    const { user } = useAuth();
    const { plan } = useUserPlan();
    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const isFree = plan === "FREE";

    const { data: plans = [], isLoading } = useQuery({
        queryKey: ["nutrition_plans", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("nutrition_plans")
                .select("*")
                .eq("user_id", user!.id)
                .eq("is_template", false)
                .order("updated_at", { ascending: false });
            if (error) throw error;
            return (data ?? []) as NutritionPlan[];
        },
        enabled: !!user && !isFree,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any)
                .from("nutrition_plans")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["nutrition_plans"] });
            toast({ title: "Plano excluído com sucesso." });
            setDeleteId(null);
        },
        onError: () => {
            toast({ title: "Erro ao excluir plano.", variant: "destructive" });
        },
    });

    if (isFree) {
        return (
            <div className="min-h-screen bg-black pb-28">
                <header className="sticky top-0 z-30 border-b border-white/5 bg-black/80 backdrop-blur-md">
                    <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
                        <BackIconButton to="/aluno/dashboard" />
                        <Apple className="h-5 w-5 text-emerald-500" />
                        <h1 className="text-base font-black uppercase tracking-tight text-white italic">Planos Alimentares</h1>
                    </div>
                </header>

                <main className="mx-auto max-w-lg px-4 pt-20 text-center">
                    <div className="mb-6 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl" />
                            <div className="relative rounded-full border border-emerald-500/20 bg-emerald-500/10 p-8">
                                <Lock className="h-12 w-12 text-emerald-500" />
                            </div>
                        </div>
                    </div>
                    <h2 className="mb-2 text-2xl font-black uppercase italic text-white">Recurso Premium</h2>
                    <p className="mb-8 text-sm text-zinc-400 leading-relaxed">
                        O Gerenciador de Dietas é exclusivo para membros <span className="font-bold text-white">Advance</span> e{" "}
                        <span className="font-bold text-white">Elite</span>. Monte suas próprias dietas ou receba planos do seu nutricionista.
                    </p>
                    <Button
                        className="w-full bg-emerald-500 text-black font-black uppercase italic h-12 rounded-2xl hover:bg-emerald-600"
                        onClick={() => navigate("/aluno/planos")}
                    >
                        Ver Planos de Assinatura
                    </Button>
                </main>

                <FloatingNavIsland />
            </div>
        );
    }

    const totalMeals = plans.reduce((acc, p) => acc + getTotalMeals(p.days), 0);

    return (
        <div className="min-h-screen bg-black pb-28">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-white/5 bg-black/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
                    <BackIconButton to="/aluno/nutricao" />
                    <Apple className="h-5 w-5 text-emerald-500" />
                    <h1 className="flex-1 text-base font-black uppercase tracking-tight text-white italic">Minhas Dietas</h1>
                    <Button
                        size="sm"
                        className="gap-1.5 bg-emerald-500 text-black font-black uppercase text-[11px] h-8 px-3 rounded-xl hover:bg-emerald-600"
                        onClick={() => navigate("/aluno/plano-alimentar/novo")}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Novo
                    </Button>
                </div>
            </header>

            <main className="mx-auto max-w-lg px-4 pt-5 space-y-5">
                {/* Hero */}
                <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900 to-black p-5">
                    <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-500/10 blur-3xl" />
                    <div className="relative">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-1">Nutrição Raiz</p>
                        <h2 className="text-2xl font-black uppercase italic text-white leading-tight">
                            Controle sua<br />alimentação
                        </h2>
                        <p className="mt-2 text-xs text-zinc-400 leading-relaxed max-w-[260px]">
                            Crie suas próprias dietas ou acesse rapidamente os planos passados pelo seu nutricionista.
                        </p>
                    </div>
                </div>

                {/* Stats */}
                {plans.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <ClipboardList className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-xl font-black text-white">{plans.length}</p>
                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Planos</p>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                <Utensils className="h-4 w-4 text-orange-400" />
                            </div>
                            <div>
                                <p className="text-xl font-black text-white">{totalMeals}</p>
                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Refeições</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* List */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/5" />
                        ))}
                    </div>
                ) : plans.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-20 text-center">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-2xl" />
                            <div className="relative rounded-full border border-dashed border-white/10 p-8">
                                <Apple className="h-10 w-10 text-zinc-600" />
                            </div>
                        </div>
                        <div>
                            <p className="font-bold text-white">Nenhum plano alimentar</p>
                            <p className="text-xs text-zinc-500 mt-1">Seu nutricionista ainda não enviou uma dieta ou você não criou nenhuma.</p>
                        </div>
                        <Button
                            className="mt-2 gap-2 bg-emerald-500 text-black font-black uppercase italic h-12 px-6 rounded-2xl hover:bg-emerald-600"
                            onClick={() => navigate("/aluno/plano-alimentar/novo")}
                        >
                            <Plus className="h-4 w-4" />
                            Criar meu plano
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                            Seus Planos
                        </h2>
                        {plans.map((p) => {
                            const totalCal = getTotalCalories(p.days);
                            const totalCalsFormatted = totalCal > 0 ? `${totalCal} kcal` : "--- kcal";
                            const isByPro = !!p.professional_creator_id;

                            return (
                                <div
                                    key={p.id}
                                    className="group relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] backdrop-blur-md hover:border-white/10 hover:bg-white/[0.05] transition-all"
                                >
                                    {/* Active indicator */}
                                    {p.is_active && (
                                        <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-emerald-500" />
                                    )}

                                    <div className="p-4 pl-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-black text-white uppercase italic tracking-tight truncate">
                                                        {p.name}
                                                    </h3>
                                                    {!p.is_active && (
                                                        <Badge className="shrink-0 text-[9px] h-4 bg-zinc-800 text-zinc-500 border-zinc-700">
                                                            Inativo
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-medium mt-2">
                                                    <span className="flex items-center gap-1">
                                                        <Utensils className="h-3 w-3" />
                                                        {(p.days as any[])?.length ?? 0} ref.
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Flame className="h-3 w-3" />
                                                        {totalCalsFormatted}
                                                    </span>
                                                    <span>
                                                        {format(new Date(p.updated_at), "dd/MM", { locale: ptBR })}
                                                    </span>
                                                </div>

                                                {isByPro && (
                                                    <Badge className="mt-2 text-[9px] h-5 bg-blue-500/10 text-blue-400 border-blue-500/20 max-w-max uppercase tracking-widest px-2">
                                                        Nutricionista
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex shrink-0 items-center gap-1">
                                                <button
                                                    className="h-8 w-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
                                                    onClick={() => navigate(`/aluno/plano-alimentar/${p.id}/editar`)}
                                                    aria-label="Editar"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    className="h-8 w-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                    onClick={() => setDeleteId(p.id)}
                                                    aria-label="Excluir"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    className="h-8 w-8 rounded-xl flex items-center justify-center text-emerald-500 hover:bg-emerald-500/10 transition-all"
                                                    onClick={() => navigate(`/aluno/plano-alimentar/${p.id}`)}
                                                    aria-label="Visualizar"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent className="bg-zinc-900 border-white/10 text-white rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-black uppercase italic">Excluir plano?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                            Essa ação não pode ser desfeita. O plano alimentar será removido permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-red-500 text-white hover:bg-red-600 font-bold"
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <FloatingNavIsland />
        </div>
    );
}
