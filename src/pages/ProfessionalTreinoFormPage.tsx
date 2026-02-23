import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Skull,
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    Dumbbell,
    Save,
    Loader2,
    Info,
    Target,
    Clock,
    Weight,
    RotateCcw,
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
import { Switch } from "@/components/ui/switch";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { ProfessionalFloatingNavIsland } from "@/components/navigation/ProfessionalFloatingNavIsland";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

type Exercise = {
    id: string;
    name: string;
    muscle_group: string;
    exercise_type: string;
    sets: number;
    reps: number;
    load: string;
    rest_seconds: number;
    rpe: number;
    technique_tip: string;
    notes: string;
};

type RoutineDay = {
    id: string;
    name: string;
    exercises: Exercise[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MUSCLE_GROUPS = [
    "Peito",
    "Costas",
    "Ombros",
    "Bíceps",
    "Tríceps",
    "Pernas",
    "Glúteos",
    "Abdômen",
    "Cardio",
    "Outro",
];

const FOOD_CATEGORIES = [
    "Café da Manhã",
    "Lanche da Manhã",
    "Almoço",
    "Lanche da Tarde",
    "Jantar",
    "Ceia",
    "Pré-Treino",
    "Pós-Treino",
    "Outro"
];

const EXERCISE_TYPES = ["Composto", "Isolado", "Cardio", "Funcional", "Isométrico"];

const MUSCLE_COLORS: Record<string, string> = {
    Peito: "bg-red-500/20 text-red-400 border-red-500/30",
    Costas: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Ombros: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    Bíceps: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    Tríceps: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Pernas: "bg-green-500/20 text-green-400 border-green-500/30",
    Glúteos: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    Abdômen: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    Cardio: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    Outro: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const RPE_LABELS: Record<number, string> = {
    1: "Muito leve",
    2: "Leve",
    3: "Moderado leve",
    4: "Moderado",
    5: "Moderado forte",
    6: "Forte",
    7: "Muito forte",
    8: "Intenso",
    9: "Máximo quase",
    10: "Máximo absoluto",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const newId = () => crypto.randomUUID();

const emptyExercise = (): Exercise => ({
    id: newId(),
    name: "",
    muscle_group: "",
    exercise_type: "",
    sets: 3,
    reps: 12,
    load: "",
    rest_seconds: 60,
    rpe: 7,
    technique_tip: "",
    notes: "",
});

const emptyDay = (index: number, label: string): RoutineDay => ({
    id: newId(),
    name: `${label} ${index + 1}`,
    exercises: [emptyExercise()],
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExerciseCard({
    ex,
    index,
    dayId,
    canRemove,
    onUpdate,
    onRemove,
    isNutritionist
}: {
    ex: Exercise;
    index: number;
    dayId: string;
    canRemove: boolean;
    onUpdate: (field: string, value: any) => void;
    onRemove: () => void;
    isNutritionist: boolean;
}) {
    const [expanded, setExpanded] = useState(true);
    const muscleColor = MUSCLE_COLORS[ex.muscle_group] ?? MUSCLE_COLORS["Outro"];

    return (
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] overflow-hidden">
            {/* Exercise header */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-all"
                onClick={() => setExpanded((e) => !e)}
            >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-black text-primary">
                    {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                        {ex.name || <span className="text-zinc-600 italic font-normal">{isNutritionist ? "Item sem nome" : "Exercício sem nome"}</span>}
                    </p>
                    {ex.muscle_group && !isNutritionist && (
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${muscleColor}`}>
                            {ex.muscle_group}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {expanded ? (
                        <ChevronUp className="h-4 w-4 text-zinc-600" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-zinc-600" />
                    )}
                </div>
            </div>

            {/* Exercise body */}
            {expanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
                    {/* Name */}
                    <div>
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                            {isNutritionist ? "Nome do Alimento / Prato *" : "Nome do exercício *"}
                        </Label>
                        <Input
                            placeholder={isNutritionist ? "Ex: Frango com Batata Doce" : "Ex: Supino Reto"}
                            value={ex.name}
                            onChange={(e) => onUpdate("name", e.target.value)}
                            className="bg-black/40 border-white/10 text-white rounded-xl h-10 placeholder:text-zinc-600"
                        />
                    </div>

                    {isNutritionist ? (
                        /* Layout Nutrição */
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                                    <Utensils className="h-3 w-3 inline mr-1" />Quantidade
                                </Label>
                                <Input
                                    placeholder="Ex: 200g, 1 un"
                                    value={ex.load}
                                    onChange={(e) => onUpdate("load", e.target.value)}
                                    className="bg-black/40 border-white/10 text-white rounded-xl h-10 placeholder:text-zinc-600 font-bold"
                                />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                                    <Flame className="h-3 w-3 inline mr-1" />Calorias (Kcal)
                                </Label>
                                <Input
                                    type="number"
                                    value={ex.rest_seconds || ""}
                                    onChange={(e) => onUpdate("rest_seconds", Number(e.target.value))}
                                    className="bg-black/40 border-white/10 text-white rounded-xl h-10 text-center font-bold"
                                />
                            </div>
                        </div>
                    ) : (
                        /* Layout Treino */
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                                    Séries
                                </Label>
                                <Input
                                    type="number"
                                    value={ex.sets}
                                    onChange={(e) => onUpdate("sets", Number(e.target.value))}
                                    className="bg-black/40 border-white/10 text-white rounded-xl h-10 text-center font-bold"
                                />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                                    Repetições
                                </Label>
                                <Input
                                    type="number"
                                    value={ex.reps}
                                    onChange={(e) => onUpdate("reps", Number(e.target.value))}
                                    className="bg-black/40 border-white/10 text-white rounded-xl h-10 text-center font-bold"
                                />
                            </div>
                        </div>
                    )}

                    {/* Technique tip / Mode */}
                    <div>
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 flex items-center gap-1">
                            {isNutritionist ? <ChefHat className="h-3 w-3" /> : <Info className="h-3 w-3" />}
                            {isNutritionist ? "Modo de Preparo / Dica" : "Dica de Técnica"}
                        </Label>
                        <Input
                            placeholder={isNutritionist ? "Ex: Grelhado sem óleo" : "Ex: Controle a descida"}
                            value={ex.technique_tip}
                            onChange={(e) => onUpdate("technique_tip", e.target.value)}
                            className="bg-black/40 border-white/10 text-white rounded-xl h-10 placeholder:text-zinc-600"
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

export default function ProfessionalTreinoFormPage() {
    const { id } = useParams<{ id: string }>();
    const isEdit = !!id;
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [days, setDays] = useState<RoutineDay[]>([]);
    const [openDayId, setOpenDayId] = useState<string | null>(null);
    const [proId, setProId] = useState<string | null>(null);
    const [specialty, setSpecialty] = useState<string | null>(null);

    const isNutritionist = specialty?.toLowerCase().includes("nutri") ||
        specialty?.toLowerCase().includes("diet");

    const dayLabel = isNutritionist ? "Refeição" : "Dia";

    // Load professional data
    useEffect(() => {
        const loadPro = async () => {
            if (!user) return;
            const { data } = await supabase.from("professionals").select("id, specialty").eq("user_id", user.id).single();
            if (data) {
                setProId(data.id);
                setSpecialty(data.specialty);
                if (!isEdit) {
                    const initialDays = [emptyDay(0, isNutritionist ? "Refeição" : "Dia")];
                    setDays(initialDays);
                    setOpenDayId(initialDays[0].id);
                }
            }
        };
        loadPro();
    }, [user, isNutritionist]);

    // Load existing routine for editing
    const { data: existing, isLoading } = useQuery({
        queryKey: ["professional_template", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("manual_routines")
                .select("*")
                .eq("id", id!)
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
            setIsActive(existing.is_active);
            const loadedDays = (existing.days as RoutineDay[])?.length > 0
                ? (existing.days as RoutineDay[])
                : [emptyDay(0, dayLabel)];
            setDays(loadedDays);
            setOpenDayId(loadedDays[0]?.id ?? null);
        }
    }, [existing]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!name.trim()) throw new Error("Nome é obrigatório");
            const payload = {
                name: name.trim(),
                description: description.trim() || null,
                is_active: isActive,
                days: days as any,
                user_id: user!.id,
                is_template: true,
                professional_creator_id: proId
            };
            if (isEdit) {
                const { error } = await supabase
                    .from("manual_routines")
                    .update(payload)
                    .eq("id", id!);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("manual_routines")
                    .insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["manual_routines"] });
            toast({ title: isEdit ? "Modelo atualizado!" : "Modelo criado!" });
            navigate("/professional/treinos");
        },
        onError: (err: any) => {
            toast({ title: err?.message || "Erro ao salvar.", variant: "destructive" });
        },
    });

    // Day helpers
    const addDay = () => {
        const newDay = emptyDay(days.length, dayLabel);
        setDays((d) => [...d, newDay]);
        setOpenDayId(newDay.id);
    };
    const removeDay = (dayId: string) => {
        setDays((d) => {
            const filtered = d.filter((x) => x.id !== dayId);
            if (openDayId === dayId) setOpenDayId(filtered[0]?.id ?? null);
            return filtered;
        });
    };
    const updateDayName = (dayId: string, value: string) =>
        setDays((d) => d.map((x) => (x.id === dayId ? { ...x, name: value } : x)));

    // Exercise helpers
    const addExercise = (dayId: string) =>
        setDays((d) =>
            d.map((day) =>
                day.id === dayId ? { ...day, exercises: [...day.exercises, emptyExercise()] } : day
            )
        );
    const removeExercise = (dayId: string, exId: string) =>
        setDays((d) =>
            d.map((day) =>
                day.id === dayId ? { ...day, exercises: day.exercises.filter((e) => e.id !== exId) } : day
            )
        );
    const updateExercise = (dayId: string, exId: string, field: string, value: any) =>
        setDays((d) =>
            d.map((day) =>
                day.id === dayId
                    ? { ...day, exercises: day.exercises.map((e) => (e.id === exId ? { ...e, [field]: value } : e)) }
                    : day
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
                    <BackIconButton to="/professional/treinos" />
                    <h1 className="flex-1 text-base font-black uppercase tracking-tight text-white italic">
                        {isEdit ? "Editar Modelo" : "Novo Modelo"}
                    </h1>
                </div>
            </header>

            <main className="mx-auto max-w-lg px-4 pt-5 space-y-6">
                {/* Routine Info */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                        {isNutritionist ? "Informações do Plano" : "Informações do Treino"}
                    </h2>

                    <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-4 space-y-4">
                        <div>
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                                Nome do Modelo *
                            </Label>
                            <Input
                                placeholder={isNutritionist ? "Ex: Emagrecimento 2000kcal" : "Ex: Hipertrofia ABCD"}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-black/40 border-white/10 text-white rounded-xl h-11 placeholder:text-zinc-600 font-bold"
                            />
                        </div>

                        <div>
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                                Descrição / Orientações
                            </Label>
                            <Textarea
                                placeholder="Ex: Foco em resultados..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                className="bg-black/40 border-white/10 text-white rounded-xl placeholder:text-zinc-600 resize-none"
                            />
                        </div>
                    </div>
                </section>

                {/* Days / Meals */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                            {isNutritionist ? "Refeições" : "Dias de Treino"}
                        </h2>
                        <button
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase text-primary hover:opacity-80 transition-all font-mono"
                            onClick={addDay}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar {dayLabel}
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {days.map((day, di) => (
                            <button
                                key={day.id}
                                onClick={() => setOpenDayId(openDayId === day.id ? null : day.id)}
                                className={`shrink-0 rounded-2xl px-4 py-2 text-[11px] font-black uppercase transition-all ${openDayId === day.id
                                    ? "bg-primary text-black"
                                    : "bg-white/5 text-zinc-400 hover:bg-white/10"
                                    }`}
                            >
                                {day.name || `${dayLabel} ${di + 1}`}
                                <span className="ml-1.5 opacity-60">({day.exercises.length})</span>
                            </button>
                        ))}
                    </div>

                    {/* Active content */}
                    {days.map((day) =>
                        openDayId !== day.id ? null : (
                            <div key={day.id} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={day.name}
                                        onChange={(e) => updateDayName(day.id, e.target.value)}
                                        placeholder={isNutritionist ? "Nome da Refeição (ex: Almoço)" : "Nome do Dia"}
                                        className="bg-black/40 border-white/10 text-white rounded-xl h-10 flex-1 placeholder:text-zinc-600 font-bold"
                                    />
                                    {days.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-zinc-600 hover:text-red-400 h-10 w-10 shrink-0"
                                            onClick={() => removeDay(day.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {day.exercises.map((ex, ei) => (
                                        <ExerciseCard
                                            key={ex.id}
                                            ex={ex}
                                            index={ei}
                                            dayId={day.id}
                                            canRemove={day.exercises.length > 1}
                                            onUpdate={(field, value) => updateExercise(day.id, ex.id, field, value)}
                                            onRemove={() => removeExercise(day.id, ex.id)}
                                            isNutritionist={isNutritionist}
                                        />
                                    ))}
                                </div>

                                <button
                                    className="w-full rounded-2xl border border-dashed border-white/10 py-3 text-[11px] font-black uppercase text-zinc-500 hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2"
                                    onClick={() => addExercise(day.id)}
                                >
                                    <Plus className="h-4 w-4" />
                                    {isNutritionist ? "Adicionar Alimento" : "Adicionar exercício"}
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
                        className="w-full bg-primary text-black font-black uppercase italic h-14 rounded-2xl hover:bg-primary/90 shadow-2xl shadow-primary/20 text-base gap-2"
                        disabled={saveMutation.isPending}
                        onClick={() => saveMutation.mutate()}
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Save className="h-5 w-5" />
                        )}
                        {isEdit ? "Salvar alterações" : "Criar Modelo"}
                    </Button>
                </div>
            </div>

            <ProfessionalFloatingNavIsland />
        </div>
    );
}
