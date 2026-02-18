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
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
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

const emptyDay = (index: number): RoutineDay => ({
  id: newId(),
  name: `Dia ${String.fromCharCode(65 + index)}`,
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
}: {
  ex: Exercise;
  index: number;
  dayId: string;
  canRemove: boolean;
  onUpdate: (field: string, value: any) => void;
  onRemove: () => void;
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
            {ex.name || <span className="text-zinc-600 italic font-normal">Exercício sem nome</span>}
          </p>
          {ex.muscle_group && (
            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${muscleColor}`}>
              {ex.muscle_group}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {ex.sets > 0 && (
            <span className="text-[10px] text-zinc-500 font-medium">
              {ex.sets}×{ex.reps}
            </span>
          )}
          {canRemove && (
            <button
              className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              aria-label="Remover exercício"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
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
              Nome do exercício *
            </Label>
            <Input
              placeholder="Ex: Supino Reto com Barra"
              value={ex.name}
              onChange={(e) => onUpdate("name", e.target.value)}
              className="bg-black/40 border-white/10 text-white rounded-xl h-10 placeholder:text-zinc-600"
            />
          </div>

          {/* Muscle group + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                <Target className="h-3 w-3 inline mr-1" />Grupo Muscular
              </Label>
              <Select value={ex.muscle_group} onValueChange={(v) => onUpdate("muscle_group", v)}>
                <SelectTrigger className="bg-black/40 border-white/10 text-white rounded-xl h-10 text-sm">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  {MUSCLE_GROUPS.map((mg) => (
                    <SelectItem key={mg} value={mg} className="focus:bg-white/10">
                      {mg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                <Dumbbell className="h-3 w-3 inline mr-1" />Tipo
              </Label>
              <Select value={ex.exercise_type} onValueChange={(v) => onUpdate("exercise_type", v)}>
                <SelectTrigger className="bg-black/40 border-white/10 text-white rounded-xl h-10 text-sm">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  {EXERCISE_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="focus:bg-white/10">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sets / Reps / Load / Rest */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                Séries
              </Label>
              <Input
                type="number"
                min={1}
                max={20}
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
                min={1}
                max={100}
                value={ex.reps}
                onChange={(e) => onUpdate("reps", Number(e.target.value))}
                className="bg-black/40 border-white/10 text-white rounded-xl h-10 text-center font-bold"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                <Weight className="h-3 w-3 inline mr-1" />Carga
              </Label>
              <Input
                placeholder="Ex: 40kg"
                value={ex.load}
                onChange={(e) => onUpdate("load", e.target.value)}
                className="bg-black/40 border-white/10 text-white rounded-xl h-10 placeholder:text-zinc-600"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                <Clock className="h-3 w-3 inline mr-1" />Descanso (seg)
              </Label>
              <Input
                type="number"
                min={0}
                max={600}
                value={ex.rest_seconds}
                onChange={(e) => onUpdate("rest_seconds", Number(e.target.value))}
                className="bg-black/40 border-white/10 text-white rounded-xl h-10 text-center font-bold"
              />
            </div>
          </div>

          {/* RPE */}
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 flex items-center justify-between">
              <span><RotateCcw className="h-3 w-3 inline mr-1" />Intensidade (RPE)</span>
              <span className="text-primary font-black">{ex.rpe}/10 — {RPE_LABELS[ex.rpe]}</span>
            </Label>
            <input
              type="range"
              min={1}
              max={10}
              value={ex.rpe}
              onChange={(e) => onUpdate("rpe", Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none bg-white/10 accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-600 mt-1">
              <span>Leve</span>
              <span>Moderado</span>
              <span>Máximo</span>
            </div>
          </div>

          {/* Technique tip */}
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 flex items-center gap-1">
              <Info className="h-3 w-3" />Dica de Técnica
            </Label>
            <Input
              placeholder="Ex: Controle a descida em 3 segundos"
              value={ex.technique_tip}
              onChange={(e) => onUpdate("technique_tip", e.target.value)}
              className="bg-black/40 border-white/10 text-white rounded-xl h-10 placeholder:text-zinc-600"
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
              Observações
            </Label>
            <Input
              placeholder="Opcional"
              value={ex.notes}
              onChange={(e) => onUpdate("notes", e.target.value)}
              className="bg-black/40 border-white/10 text-white rounded-xl h-10 placeholder:text-zinc-600"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ModoRaizFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [days, setDays] = useState<RoutineDay[]>([emptyDay(0)]);
  const [openDayId, setOpenDayId] = useState<string | null>(null);

  // Load existing routine for editing
  const { data: existing, isLoading } = useQuery({
    queryKey: ["manual_routine", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_routines" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
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
        : [emptyDay(0)];
      setDays(loadedDays);
      setOpenDayId(loadedDays[0]?.id ?? null);
    } else if (!isEdit) {
      setOpenDayId(days[0]?.id ?? null);
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Nome da rotina é obrigatório");
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        is_active: isActive,
        days: days as any,
        user_id: user!.id,
      };
      if (isEdit) {
        const { error } = await supabase
          .from("manual_routines" as any)
          .update(payload)
          .eq("id", id!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("manual_routines" as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual_routines"] });
      toast({ title: isEdit ? "Rotina atualizada!" : "Rotina criada com sucesso!" });
      navigate("/aluno/modo-raiz");
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Erro ao salvar rotina.", variant: "destructive" });
    },
  });

  // Day helpers
  const addDay = () => {
    const newDay = emptyDay(days.length);
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
          <BackIconButton to="/aluno/modo-raiz" />
          <Skull className="h-5 w-5 text-primary" />
          <h1 className="flex-1 text-base font-black uppercase tracking-tight text-white italic">
            {isEdit ? "Editar Rotina" : "Nova Rotina"}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5 space-y-6">
        {/* ── Routine Info ── */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Informações da Rotina
          </h2>

          <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-4 space-y-4">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                Nome da rotina *
              </Label>
              <Input
                id="routine-name"
                placeholder="Ex: Push Pull Legs, ABC, Full Body…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-black/40 border-white/10 text-white rounded-xl h-11 placeholder:text-zinc-600 font-bold"
              />
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
                Descrição / Objetivo
              </Label>
              <Textarea
                id="routine-desc"
                placeholder="Ex: Foco em hipertrofia, 4x por semana, método piramidal…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="bg-black/40 border-white/10 text-white rounded-xl placeholder:text-zinc-600 resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Rotina ativa</p>
                <p className="text-[10px] text-zinc-500">Aparece em destaque na lista</p>
              </div>
              <Switch id="routine-active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </section>

        {/* ── Days ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Dias de Treino
            </h2>
            <button
              className="flex items-center gap-1.5 text-[10px] font-black uppercase text-primary hover:opacity-80 transition-all"
              onClick={addDay}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar dia
            </button>
          </div>

          {/* Day tabs */}
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
                {day.name || `Dia ${di + 1}`}
                <span className="ml-1.5 opacity-60">({day.exercises.length})</span>
              </button>
            ))}
          </div>

          {/* Active day content */}
          {days.map((day) =>
            openDayId !== day.id ? null : (
              <div key={day.id} className="space-y-4">
                {/* Day name + remove */}
                <div className="flex items-center gap-2">
                  <Input
                    value={day.name}
                    onChange={(e) => updateDayName(day.id, e.target.value)}
                    placeholder="Nome do dia (ex: Peito e Tríceps)"
                    className="bg-black/40 border-white/10 text-white rounded-xl h-10 flex-1 placeholder:text-zinc-600 font-bold"
                  />
                  {days.length > 1 && (
                    <button
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                      onClick={() => removeDay(day.id)}
                      aria-label="Remover dia"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Exercises */}
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
                    />
                  ))}
                </div>

                {/* Add exercise */}
                <button
                  className="w-full rounded-2xl border border-dashed border-white/10 py-3 text-[11px] font-black uppercase text-zinc-500 hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2"
                  onClick={() => addExercise(day.id)}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar exercício
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
            {isEdit ? "Salvar alterações" : "Criar rotina"}
          </Button>
        </div>
      </div>

      <FloatingNavIsland />
    </div>
  );
}
