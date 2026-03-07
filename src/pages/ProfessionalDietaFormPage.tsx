import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    Save,
    Loader2,
    Apple,
    Utensils,
    Flame,
    ChefHat
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { ProfessionalFloatingNavIsland } from "@/components/navigation/ProfessionalFloatingNavIsland";

// ─── Types ────────────────────────────────────────────────────────────────────

type FoodItem = {
    id: string;
    name: string;
    quantity: string;
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    preparation: string;
    substitutions?: string;
    observations?: string;
};

type DietMealBlock = {
    id: string;
    name: string;
    items: FoodItem[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const newId = () => crypto.randomUUID();

const emptyFoodItem = (): FoodItem => ({
    id: newId(),
    name: "",
    quantity: "",
    calories: 0,
    proteins: 0,
    carbs: 0,
    fats: 0,
    preparation: "",
    substitutions: "",
    observations: "",
});

const emptyMealBlock = (index: number): DietMealBlock => ({
    id: newId(),
    name: `Refeição ${index + 1}`,
    items: [emptyFoodItem()],
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function FoodItemCard({
    item,
    index,
    mealId,
    canRemove,
    onUpdate,
    onRemove,
}: {
    item: FoodItem;
    index: number;
    mealId: string;
    canRemove: boolean;
    onUpdate: (field: string, value: any) => void;
    onRemove: () => void;
}) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-all"
                onClick={() => setExpanded((e) => !e)}
            >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-black text-primary">
                    {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                        {item.name || <span className="text-zinc-600 italic font-normal">Alimento sem nome</span>}
                    </p>
                    {item.quantity && (
                        <span className="text-[9px] font-bold text-zinc-500">{item.quantity}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {item.calories > 0 && (
                        <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                            {item.calories} kcal
                        </span>
                    )}
                    {expanded ? (
                        <ChevronUp className="h-4 w-4 text-zinc-600" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-zinc-600" />
                    )}
                </div>
            </div>

            {/* Body */}
            {expanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
                    <div className="space-y-4">
                        {/* Name */}
                        <div>
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                                Nome do Alimento / Prato *
                            </Label>
                            <Textarea
                                placeholder="Ex: Frango Grelhado, Arroz Branco..."
                                value={item.name}
                                onChange={(e) => onUpdate("name", e.target.value)}
                                rows={2}
                                className="bg-black/40 border-white/10 text-white rounded-xl placeholder:text-zinc-600 resize-none font-sans"
                            />
                        </div>

                        {/* Quantity */}
                        <div>
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                                <Utensils className="h-3 w-3 inline mr-1 text-emerald-500" />Quantidade
                            </Label>
                            <Textarea
                                placeholder="Ex: 150g, 2 colheres"
                                value={item.quantity}
                                onChange={(e) => onUpdate("quantity", e.target.value)}
                                rows={2}
                                className="bg-black/40 border-white/10 text-white rounded-xl placeholder:text-zinc-600 font-bold resize-none font-sans"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        <div>
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block whitespace-nowrap overflow-hidden text-ellipsis">Kcal</Label>
                            <Input
                                type="number"
                                value={item.calories || ""}
                                onChange={(e) => onUpdate("calories", Number(e.target.value))}
                                className="bg-black/40 border-[#ffac52]/20 text-white rounded-xl h-9 text-center focus-visible:ring-[#ffac52]/50"
                            />
                        </div>
                        <div>
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block whitespace-nowrap overflow-hidden text-ellipsis">Proteínas</Label>
                            <Input
                                type="number"
                                value={item.proteins || ""}
                                onChange={(e) => onUpdate("proteins", Number(e.target.value))}
                                className="bg-black/40 border-[#ff5e5e]/20 text-white rounded-xl h-9 text-center focus-visible:ring-[#ff5e5e]/50"
                            />
                        </div>
                        <div>
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block whitespace-nowrap overflow-hidden text-ellipsis">Carbos</Label>
                            <Input
                                type="number"
                                value={item.carbs || ""}
                                onChange={(e) => onUpdate("carbs", Number(e.target.value))}
                                className="bg-black/40 border-[#5caefe]/20 text-white rounded-xl h-9 text-center focus-visible:ring-[#5caefe]/50"
                            />
                        </div>
                        <div>
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block whitespace-nowrap overflow-hidden text-ellipsis">Gorduras</Label>
                            <Input
                                type="number"
                                value={item.fats || ""}
                                onChange={(e) => onUpdate("fats", Number(e.target.value))}
                                className="bg-black/40 border-[#ecd34a]/20 text-white rounded-xl h-9 text-center focus-visible:ring-[#ecd34a]/50"
                            />
                        </div>
                    </div>

                    {/* Preparation */}
                    <div>
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 flex items-center gap-1">
                            <ChefHat className="h-3 w-3" />
                            Modo de Preparo / Orientações
                        </Label>
                        <Textarea
                            placeholder="Ex: Fazer na Airfryer sem óleo adicional..."
                            value={item.preparation || ""}
                            onChange={(e) => onUpdate("preparation", e.target.value)}
                            rows={2}
                            className="bg-black/40 border-white/10 text-white rounded-xl placeholder:text-zinc-600 resize-none font-sans"
                        />
                    </div>

                    {/* Substitutions */}
                    <div>
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 flex items-center gap-1">
                            Opções de Substituição
                        </Label>
                        <Textarea
                            placeholder="Ex: Rap 10 - 1 Unidade
Ovo Cozido - 2 Unidades"
                            value={item.substitutions || ""}
                            onChange={(e) => onUpdate("substitutions", e.target.value)}
                            rows={3}
                            className="bg-black/40 border-white/10 text-white rounded-xl placeholder:text-zinc-600 resize-none font-sans"
                        />
                    </div>

                    {/* Observations */}
                    <div>
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 flex items-center gap-1">
                            Observações Gerais
                        </Label>
                        <Textarea
                            placeholder="Ex: Usar adoçante se houver necessidade de adoçar o café..."
                            value={item.observations || ""}
                            onChange={(e) => onUpdate("observations", e.target.value)}
                            rows={2}
                            className="bg-black/40 border-white/10 text-white rounded-xl placeholder:text-zinc-600 resize-none font-sans"
                        />
                    </div>

                    <div className="flex justify-end">
                        {canRemove && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-500 hover:bg-red-500/10 h-8 gap-2"
                                onClick={onRemove}
                            >
                                <Trash2 className="h-3 w-3" /> Remover
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfessionalDietaFormPage() {
    const { planId } = useParams<{ planId: string }>();
    const isEdit = !!planId;
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [meals, setMeals] = useState<DietMealBlock[]>([]);
    const [openMealId, setOpenMealId] = useState<string | null>(null);
    const [proId, setProId] = useState<string | null>(null);

    // Load professional data
    useEffect(() => {
        const loadPro = async () => {
            if (!user) return;
            const { data } = await (supabase as any).from("professionals").select("id").eq("user_id", user.id).single();
            if (data) {
                setProId(data.id);
                if (!isEdit) {
                    const initialMeals = [emptyMealBlock(0)];
                    setMeals(initialMeals);
                    setOpenMealId(initialMeals[0].id);
                }
            }
        };
        loadPro();
    }, [user, isEdit]);

    // Load existing plan for editing
    const { data: existing, isLoading } = useQuery({
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
        enabled: isEdit,
    });

    useEffect(() => {
        if (existing) {
            setName(existing.name);
            setDescription(existing.description ?? "");
            const loadedMeals = (existing.days as DietMealBlock[])?.length > 0
                ? (existing.days as DietMealBlock[])
                : [emptyMealBlock(0)];
            setMeals(loadedMeals);
            setOpenMealId(loadedMeals[0]?.id ?? null);
        }
    }, [existing]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!name.trim()) throw new Error("Nome é obrigatório");
            const payload = {
                name: name.trim(),
                description: description.trim() || null,
                is_active: false, // Templates are not active for the pro themselves
                days: meals as any,
                user_id: user!.id,
                is_template: true,
                professional_creator_id: proId
            };
            if (isEdit) {
                const { error } = await (supabase as any)
                    .from("nutrition_plans")
                    .update(payload)
                    .eq("id", planId!);
                if (error) throw error;
            } else {
                const { error } = await (supabase as any)
                    .from("nutrition_plans")
                    .insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["nutrition_plans"] });
            toast({ title: isEdit ? "Modelo atualizado!" : "Modelo criado!" });
            navigate("/professional/dietas");
        },
        onError: (err: any) => {
            toast({ title: err?.message || "Erro ao salvar.", variant: "destructive" });
        },
    });

    // Meal helpers
    const addMealBlock = () => {
        const newMeal = emptyMealBlock(meals.length);
        setMeals((m) => [...m, newMeal]);
        setOpenMealId(newMeal.id);
    };
    const removeMealBlock = (mealId: string) => {
        setMeals((m) => {
            const filtered = m.filter((x) => x.id !== mealId);
            if (openMealId === mealId) setOpenMealId(filtered[0]?.id ?? null);
            return filtered;
        });
    };
    const updateMealName = (mealId: string, value: string) =>
        setMeals((m) => m.map((x) => (x.id === mealId ? { ...x, name: value } : x)));

    // Food helpers
    const addFoodItem = (mealId: string) =>
        setMeals((m) =>
            m.map((meal) =>
                meal.id === mealId ? { ...meal, items: [...meal.items, emptyFoodItem()] } : meal
            )
        );
    const removeFoodItem = (mealId: string, itemId: string) =>
        setMeals((m) =>
            m.map((meal) =>
                meal.id === mealId ? { ...meal, items: meal.items.filter((e) => e.id !== itemId) } : meal
            )
        );
    const updateFoodItem = (mealId: string, itemId: string, field: string, value: any) =>
        setMeals((m) =>
            m.map((meal) =>
                meal.id === mealId
                    ? { ...meal, items: meal.items.map((e) => (e.id === itemId ? { ...e, [field]: value } : e)) }
                    : meal
            )
        );

    if (isEdit && isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black pb-44">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-white/5 bg-black/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
                    <BackIconButton to="/professional/dietas" />
                    <h1 className="flex-1 text-base font-black uppercase tracking-tight text-white italic">
                        {isEdit ? "Editar Plano Alimentar" : "Novo Plano Alimentar"}
                    </h1>
                </div>
            </header>

            <main className="mx-auto max-w-lg px-4 pt-5 space-y-6">
                {/* Plan Info */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                        Informações Gerais
                    </h2>

                    <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-4 space-y-4">
                        <div>
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                                Nome do Modelo *
                            </Label>
                            <Input
                                placeholder="Ex: Hipertrofia Agressiva 3500kcal"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-black/40 border-white/10 text-white rounded-xl h-11 placeholder:text-zinc-600 font-bold"
                            />
                        </div>

                        <div>
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                                Resumo / Orientações do Especialista
                            </Label>
                            <Textarea
                                placeholder="Ex: Beba pelo menos 3L de água por dia..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="bg-black/40 border-white/10 text-white rounded-xl placeholder:text-zinc-600 resize-none"
                            />
                        </div>
                    </div>
                </section>

                {/* Meals */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                            Refeições do Plano
                        </h2>
                        <button
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase text-primary hover:opacity-80 transition-all font-mono"
                            onClick={addMealBlock}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar Refeição
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {meals.map((meal, idx) => (
                            <button
                                key={meal.id}
                                onClick={() => setOpenMealId(openMealId === meal.id ? null : meal.id)}
                                className={`shrink-0 rounded-2xl px-4 py-2 text-[11px] font-black uppercase transition-all ${openMealId === meal.id
                                    ? "bg-primary text-black"
                                    : "bg-white/5 text-zinc-400 hover:bg-white/10"
                                    }`}
                            >
                                {meal.name || `Refeição ${idx + 1}`}
                                <span className="ml-1.5 opacity-60">({meal.items.length})</span>
                            </button>
                        ))}
                    </div>

                    {/* Active content */}
                    {meals.map((meal) =>
                        openMealId !== meal.id ? null : (
                            <div key={meal.id} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={meal.name}
                                        onChange={(e) => updateMealName(meal.id, e.target.value)}
                                        placeholder="Nome da Refeição (ex: Café da Manhã às 8h)"
                                        className="bg-black/40 border-white/10 text-white rounded-xl h-10 flex-1 placeholder:text-zinc-600 font-bold"
                                    />
                                    {meals.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-zinc-600 hover:text-red-400 h-10 w-10 shrink-0 border border-white/5 bg-white/[0.02]"
                                            onClick={() => removeMealBlock(meal.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {meal.items.map((item, idx) => (
                                        <FoodItemCard
                                            key={item.id}
                                            item={item}
                                            index={idx}
                                            mealId={meal.id}
                                            canRemove={meal.items.length > 1}
                                            onUpdate={(field, value) => updateFoodItem(meal.id, item.id, field, value)}
                                            onRemove={() => removeFoodItem(meal.id, item.id)}
                                        />
                                    ))}
                                </div>

                                <button
                                    className="w-full rounded-2xl border border-dashed border-white/10 py-3 text-[11px] font-black uppercase text-zinc-500 hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2"
                                    onClick={() => addFoodItem(meal.id)}
                                >
                                    <Plus className="h-4 w-4" />
                                    Adicionar Alimento
                                </button>
                            </div>
                        )
                    )}
                </section>
            </main>

            {/* Sticky Save Button */}
            <div className="fixed bottom-28 left-0 right-0 z-40 px-4">
                <div className="mx-auto max-w-lg">
                    <Button
                        className="w-full bg-primary text-black font-black uppercase italic h-14 rounded-2xl hover:bg-primary/90 shadow-2xl shadow-primary/20 text-base gap-2 transition-all"
                        disabled={saveMutation.isPending}
                        onClick={() => saveMutation.mutate()}
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Save className="h-5 w-5" />
                        )}
                        {isEdit ? "Salvar alterações" : "Salvar na Biblioteca"}
                    </Button>
                </div>
            </div>

            <ProfessionalFloatingNavIsland />
        </div>
    );
}
