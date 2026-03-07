import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Pencil,
    Utensils,
    Flame,
    ChefHat,
    ChevronDown,
    ChevronUp,
    Zap,
    Calendar,
    Loader2,
    Apple,
    RefreshCw,
    Info
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Sub-components ───────────────────────────────────────────────────────────

function MealBlockCard({ meal, index }: { meal: any; index: number }) {
    const [expanded, setExpanded] = useState(true);
    const items = (meal.items ?? []) as any[];
    const totalCals = items.reduce((acc, item) => acc + (Number(item.calories) || 0), 0);
    const totalProteins = items.reduce((acc, item) => acc + (Number(item.proteins) || 0), 0);
    const totalCarbs = items.reduce((acc, item) => acc + (Number(item.carbs) || 0), 0);
    const totalFats = items.reduce((acc, item) => acc + (Number(item.fats) || 0), 0);

    return (
        <div className="rounded-3xl border border-white/5 bg-white/[0.03] overflow-hidden">
            {/* Header */}
            <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all"
                onClick={() => setExpanded((e) => !e)}
            >
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <span className="text-xs font-black text-emerald-500">{index + 1}</span>
                    </div>
                    <div className="text-left">
                        <p className="font-black text-white uppercase italic tracking-tight text-sm">
                            {meal.name || `Refeição ${index + 1}`}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-medium">
                            {items.length} alimento{items.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {totalCals > 0 && (
                        <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full hidden sm:block">
                            {totalCals} kcal
                        </span>
                    )}
                    {expanded ? (
                        <ChevronUp className="h-4 w-4 text-zinc-600" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-zinc-600" />
                    )}
                </div>
            </button>

            {/* Meal Items */}
            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                    {/* Macros row */}
                    {(totalCals > 0 || totalProteins > 0 || totalCarbs > 0 || totalFats > 0) && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {totalCals > 0 && (
                                <div className="flex items-center gap-1 text-[10px] font-bold bg-orange-500/10 text-orange-400 px-2 py-1 rounded-full">
                                    <Flame className="h-3 w-3" /> {totalCals} kcal
                                </div>
                            )}
                            {totalProteins > 0 && (
                                <div className="flex items-center gap-1 text-[10px] font-bold bg-red-500/10 text-red-400 px-2 py-1 rounded-full">
                                    P: {totalProteins}g
                                </div>
                            )}
                            {totalCarbs > 0 && (
                                <div className="flex items-center gap-1 text-[10px] font-bold bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full">
                                    C: {totalCarbs}g
                                </div>
                            )}
                            {totalFats > 0 && (
                                <div className="flex items-center gap-1 text-[10px] font-bold bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-full">
                                    G: {totalFats}g
                                </div>
                            )}
                        </div>
                    )}

                    {items.length === 0 ? (
                        <p className="text-xs text-zinc-600 italic text-center py-4">
                            Nenhum alimento nesta refeição.
                        </p>
                    ) : (
                        items.map((item: any, ii: number) => {
                            return (
                                <div
                                    key={item.id ?? ii}
                                    className="rounded-2xl border border-white/5 bg-black/30 p-4 space-y-3"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-black text-emerald-500 mt-0.5">
                                            {ii + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-white text-sm leading-tight">
                                                {item.name || "Alimento sem nome"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats chips */}
                                    <div className="flex flex-wrap gap-2">
                                        {/* Quantity */}
                                        {item.quantity && (
                                            <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5">
                                                <Utensils className="h-3 w-3 text-emerald-500" />
                                                <span className="text-xs font-black text-white">
                                                    {item.quantity}
                                                </span>
                                            </div>
                                        )}

                                        {/* Calories */}
                                        {item.calories > 0 && (
                                            <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5">
                                                <Flame className="h-3 w-3 text-orange-400" />
                                                <span className="text-xs font-bold text-white">{item.calories} kcal</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Macros individual */}
                                    {(item.proteins > 0 || item.carbs > 0 || item.fats > 0) && (
                                        <div className="flex gap-2 text-[9px] font-bold text-zinc-500 pl-1 uppercase tracking-widest">
                                            {item.proteins > 0 && <span>P: <span className="text-zinc-300">{item.proteins}g</span></span>}
                                            {item.carbs > 0 && <span>C: <span className="text-zinc-300">{item.carbs}g</span></span>}
                                            {item.fats > 0 && <span>G: <span className="text-zinc-300">{item.fats}g</span></span>}
                                        </div>
                                    )}

                                    {/* Preparation */}
                                    {item.preparation && (
                                        <div className="flex items-start gap-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 px-3 py-2">
                                            <ChefHat className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-emerald-500/80 italic leading-relaxed whitespace-pre-wrap">
                                                {item.preparation}
                                            </p>
                                        </div>
                                    )}

                                    {/* Substitutions */}
                                    {item.substitutions && (
                                        <div className="flex items-start gap-2 rounded-xl bg-blue-500/5 border border-blue-500/10 px-3 py-2 mt-2">
                                            <RefreshCw className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-0.5 line-clamp-1">Opções de Substituição</p>
                                                <p className="text-[11px] text-blue-500/80 leading-relaxed whitespace-pre-wrap font-sans">
                                                    {item.substitutions}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Observations */}
                                    {item.observations && (
                                        <div className="flex items-start gap-2 rounded-xl bg-yellow-500/5 border border-yellow-500/10 px-3 py-2 mt-2">
                                            <Info className="h-3 w-3 text-yellow-500 shrink-0 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-yellow-500 mb-0.5 line-clamp-1">Observações</p>
                                                <p className="text-[11px] text-yellow-500/80 leading-relaxed whitespace-pre-wrap font-sans">
                                                    {item.observations}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlanoAlimentarViewPage() {
    const { planId } = useParams<{ planId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const { data: plan, isLoading } = useQuery({
        queryKey: ["nutrition_plan", planId],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("nutrition_plans")
                .select("*")
                .eq("id", planId!)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!user && !!planId,
    });

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-black gap-4">
                <Apple className="h-12 w-12 text-zinc-700" />
                <p className="text-zinc-500">Plano Alimentar não encontrado.</p>
                <Button
                    variant="outline"
                    className="rounded-2xl border-white/10 text-white hover:bg-white/10"
                    onClick={() => navigate("/aluno/plano-alimentar")}
                >
                    Voltar
                </Button>
            </div>
        );
    }

    const meals = (plan.days ?? []) as any[];
    const totalFoods = meals.reduce((acc: number, m: any) => acc + (m.items?.length ?? 0), 0);

    return (
        <div className="min-h-screen bg-black pb-28">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-white/5 bg-black/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
                    <BackIconButton to="/aluno/plano-alimentar" />
                    <Apple className="h-5 w-5 text-emerald-500" />
                    <h1 className="flex-1 truncate text-base font-black uppercase tracking-tight text-white italic">
                        {plan.name}
                    </h1>
                    {/* Exibe botão de edição apenas se for dono do plano ou não for template */}
                    {!plan.professional_creator_id && (
                        <button
                            className="h-9 w-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                            onClick={() => navigate(`/aluno/plano-alimentar/${planId}/editar`)}
                            aria-label="Editar"
                        >
                            <Pencil className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </header>

            <main className="mx-auto max-w-lg px-4 pt-5 space-y-5">
                {/* Meta info */}
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge
                        className={
                            plan.is_active
                                ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30 font-bold uppercase text-[10px]"
                                : "bg-zinc-800 text-zinc-500 border-zinc-700 font-bold uppercase text-[10px]"
                        }
                    >
                        {plan.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                        <Calendar className="h-3 w-3" />
                        Gerado em {format(new Date(plan.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                        <Zap className="h-3 w-3" />
                        {meals.length} refeições · {totalFoods} alimentos
                    </span>
                </div>

                {/* Description */}
                {plan.description && (
                    <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                        <p className="text-xs text-zinc-400 leading-relaxed italic whitespace-pre-line">{plan.description}</p>
                    </div>
                )}

                {/* Meals */}
                {meals.length === 0 ? (
                    <div className="py-16 text-center">
                        <Utensils className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500">Nenhuma refeição cadastrada.</p>
                        {!plan.professional_creator_id && (
                            <Button
                                className="mt-4 rounded-2xl bg-emerald-500 text-black font-black uppercase italic"
                                onClick={() => navigate(`/aluno/plano-alimentar/${planId}/editar`)}
                            >
                                Adicionar Refeições
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {meals.map((meal: any, idx: number) => (
                            <MealBlockCard key={meal.id ?? idx} meal={meal} index={idx} />
                        ))}
                    </div>
                )}
            </main>

            <FloatingNavIsland />
        </div>
    );
}
