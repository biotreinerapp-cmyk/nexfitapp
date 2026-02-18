import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Skull,
  Pencil,
  Play,
  Clock,
  Weight,
  Target,
  Info,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Zap,
  Calendar,
  Loader2,
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

const TYPE_COLORS: Record<string, string> = {
  Composto: "text-primary",
  Isolado: "text-blue-400",
  Cardio: "text-rose-400",
  Funcional: "text-green-400",
  Isométrico: "text-purple-400",
};

const RPE_COLORS: Record<number, string> = {
  1: "text-green-400", 2: "text-green-400", 3: "text-green-400",
  4: "text-yellow-400", 5: "text-yellow-400", 6: "text-yellow-400",
  7: "text-orange-400", 8: "text-orange-400",
  9: "text-red-400", 10: "text-red-400",
};

function formatRest(seconds: number): string {
  if (!seconds) return "";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}min ${s}s` : `${m}min`;
}

// ─── Day Card ─────────────────────────────────────────────────────────────────

function DayCard({ day, index }: { day: any; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const exercises = (day.exercises ?? []) as any[];

  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.03] overflow-hidden">
      {/* Day header */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-black text-primary">{String.fromCharCode(65 + index)}</span>
          </div>
          <div className="text-left">
            <p className="font-black text-white uppercase italic tracking-tight text-sm">
              {day.name || `Dia ${index + 1}`}
            </p>
            <p className="text-[10px] text-zinc-500 font-medium">
              {exercises.length} exercício{exercises.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-600" />
        )}
      </button>

      {/* Exercises */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {exercises.length === 0 ? (
            <p className="text-xs text-zinc-600 italic text-center py-4">
              Nenhum exercício neste dia.
            </p>
          ) : (
            exercises.map((ex: any, ei: number) => {
              const muscleColor = MUSCLE_COLORS[ex.muscle_group] ?? MUSCLE_COLORS["Outro"];
              const typeColor = TYPE_COLORS[ex.exercise_type] ?? "text-zinc-400";
              const rpeColor = RPE_COLORS[ex.rpe] ?? "text-zinc-400";

              return (
                <div
                  key={ex.id ?? ei}
                  className="rounded-2xl border border-white/5 bg-black/30 p-4 space-y-3"
                >
                  {/* Exercise name row */}
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-black text-primary mt-0.5">
                      {ei + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-sm leading-tight">
                        {ex.name || "Exercício sem nome"}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {ex.muscle_group && (
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${muscleColor}`}>
                            {ex.muscle_group}
                          </span>
                        )}
                        {ex.exercise_type && (
                          <span className={`text-[9px] font-bold uppercase ${typeColor}`}>
                            {ex.exercise_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats chips */}
                  <div className="flex flex-wrap gap-2">
                    {/* Sets × Reps */}
                    <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5">
                      <Dumbbell className="h-3 w-3 text-primary" />
                      <span className="text-xs font-black text-white">
                        {ex.sets}×{ex.reps}
                      </span>
                      <span className="text-[9px] text-zinc-500">séries</span>
                    </div>

                    {/* Load */}
                    {ex.load && (
                      <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5">
                        <Weight className="h-3 w-3 text-zinc-400" />
                        <span className="text-xs font-bold text-white">{ex.load}</span>
                      </div>
                    )}

                    {/* Rest */}
                    {ex.rest_seconds > 0 && (
                      <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5">
                        <Clock className="h-3 w-3 text-zinc-400" />
                        <span className="text-xs font-bold text-white">{formatRest(ex.rest_seconds)}</span>
                      </div>
                    )}

                    {/* RPE */}
                    {ex.rpe > 0 && (
                      <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5">
                        <Target className="h-3 w-3 text-zinc-400" />
                        <span className={`text-xs font-black ${rpeColor}`}>RPE {ex.rpe}</span>
                      </div>
                    )}
                  </div>

                  {/* Technique tip */}
                  {ex.technique_tip && (
                    <div className="flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2">
                      <Info className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      <p className="text-[11px] text-primary/80 italic leading-relaxed">
                        {ex.technique_tip}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  {ex.notes && (
                    <p className="text-[11px] text-zinc-500 italic pl-1">{ex.notes}</p>
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

export default function ModoRaizViewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: routine, isLoading } = useQuery({
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
    enabled: !!user && !!id,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black gap-4">
        <Skull className="h-12 w-12 text-zinc-700" />
        <p className="text-zinc-500">Rotina não encontrada.</p>
        <Button
          variant="outline"
          className="rounded-2xl border-white/10"
          onClick={() => navigate("/aluno/modo-raiz")}
        >
          Voltar
        </Button>
      </div>
    );
  }

  const days = (routine.days ?? []) as any[];
  const totalExercises = days.reduce((acc: number, d: any) => acc + (d.exercises?.length ?? 0), 0);

  return (
    <div className="min-h-screen bg-black pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-black/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <BackIconButton to="/aluno/modo-raiz" />
          <Skull className="h-5 w-5 text-primary" />
          <h1 className="flex-1 truncate text-base font-black uppercase tracking-tight text-white italic">
            {routine.name}
          </h1>
          <button
            className="h-9 w-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            onClick={() => navigate(`/aluno/modo-raiz/${id}/editar`)}
            aria-label="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5 space-y-5">
        {/* Meta info */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge
            className={
              routine.is_active
                ? "bg-primary/20 text-primary border-primary/30 font-bold uppercase text-[10px]"
                : "bg-zinc-800 text-zinc-500 border-zinc-700 font-bold uppercase text-[10px]"
            }
          >
            {routine.is_active ? "Ativa" : "Inativa"}
          </Badge>
          <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
            <Calendar className="h-3 w-3" />
            Editado em {format(new Date(routine.updated_at), "dd/MM/yyyy", { locale: ptBR })}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
            <Zap className="h-3 w-3" />
            {days.length} dia{days.length !== 1 ? "s" : ""} · {totalExercises} exercício{totalExercises !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Description */}
        {routine.description && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
            <p className="text-xs text-zinc-400 leading-relaxed italic">{routine.description}</p>
          </div>
        )}

        {/* Days */}
        {days.length === 0 ? (
          <div className="py-16 text-center">
            <Dumbbell className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Nenhum dia de treino cadastrado.</p>
            <Button
              className="mt-4 rounded-2xl bg-primary text-black font-black uppercase italic"
              onClick={() => navigate(`/aluno/modo-raiz/${id}/editar`)}
            >
              Adicionar dias
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {days.map((day: any, di: number) => (
              <DayCard key={day.id ?? di} day={day} index={di} />
            ))}
          </div>
        )}

        {/* CTA */}
        {days.length > 0 && (
          <div className="space-y-3">
            {days.length > 1 && (
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 text-center">
                Selecione o dia para iniciar
              </p>
            )}
            {days.length === 1 ? (
              <Button
                className="w-full bg-primary text-black font-black uppercase italic h-14 rounded-2xl hover:bg-primary/90 shadow-2xl shadow-primary/20 text-base gap-2"
                onClick={() => navigate(`/aluno/modo-raiz/${id}/treino/0`)}
              >
                <Play className="h-5 w-5 fill-black" />
                Iniciar Treino
              </Button>
            ) : (
              <div className="space-y-2">
                {days.map((day: any, di: number) => (
                  <Button
                    key={day.id ?? di}
                    className="w-full bg-primary/10 text-primary border border-primary/20 font-black uppercase italic h-12 rounded-2xl hover:bg-primary hover:text-black transition-all gap-2"
                    onClick={() => navigate(`/aluno/modo-raiz/${id}/treino/${di}`)}
                  >
                    <Play className="h-4 w-4" />
                    {day.name || `Dia ${di + 1}`}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <FloatingNavIsland />
    </div>
  );
}
