import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlayCircle, Target, Info, CheckCircle2, Dumbbell, Zap,
  Timer, ChevronRight, Activity, Youtube, X, Sparkles, RotateCcw,
  Layers, Weight,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SecureVideo } from "@/components/ui/SecureVideo";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { translateInstructions } from "@/lib/translateExercise";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import defaultExerciseImage from "@/assets/default-exercise.png";
import { BackIconButton } from "@/components/navigation/BackIconButton";

const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || "7abffdb721mshe6edf9169775d83p1212ffjsn4c407842489b";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BibliotecaExercicio {
  id: string;
  nome: string | null;
  body_part: string | null;
  target_muscle: string | null;
  equipment: string | null;
  video_url: string | null;
  instrucoes: string[] | null;
}

interface AgendaTreinoRow {
  id: string;
  dia_semana: number | null;
  exercicios: any | null;
}

interface AgendaExercicioDia {
  exercicio_id: string;
  nome: string | null;
  body_part: string | null;
  target_muscle: string | null;
  equipment: string | null;
  video_url: string | null;
  instrucoes: string[] | null;
  series: number;
  repeticoes: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

function getYouTubeId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  return url?.match(regex)?.[1] ?? null;
}

/** Colour for target_muscle badge */
function muscleBadgeClass(muscle: string | null) {
  const m = (muscle ?? "").toLowerCase();
  if (m.includes("peito") || m.includes("peitoral")) return "bg-red-500/15 text-red-400 border-red-500/30";
  if (m.includes("costas") || m.includes("dorsal")) return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (m.includes("perna") || m.includes("quad")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (m.includes("bíceps") || m.includes("bicep")) return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  if (m.includes("tríceps") || m.includes("tricep")) return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  if (m.includes("ombro") || m.includes("shoulder")) return "bg-sky-500/15 text-sky-400 border-sky-500/30";
  if (m.includes("abdôm") || m.includes("core")) return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  return "bg-white/10 text-white/60 border-white/10";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EquipmentChip({ equipment }: { equipment: string | null }) {
  return (
    <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider">
      <Weight className="h-3 w-3 shrink-0" />
      {equipment || "Peso Corporal"}
    </span>
  );
}

interface ExerciseCardProps {
  ex: AgendaExercicioDia;
  idx: number;
  done: boolean;
  onToggleDone: () => void;
  onOpen: () => void;
  onYoutube: () => void;
}

function ExerciseCard({ ex, idx, done, onToggleDone, onOpen, onYoutube }: ExerciseCardProps) {
  const gifUrl = ex.video_url ?? defaultExerciseImage;
  const ytId = getYouTubeId(gifUrl);
  const muscleLabel = ex.target_muscle || ex.body_part || "Força";

  return (
    <div
      className={cn(
        "group relative flex overflow-hidden rounded-[28px] border transition-all duration-300 backdrop-blur-xl",
        "animate-in fade-in slide-in-from-bottom-4 fill-mode-both",
        done
          ? "border-emerald-500/30 bg-emerald-500/5 opacity-70"
          : "border-white/5 bg-gradient-to-br from-white/[0.05] to-transparent"
      )}
      style={{ animationDelay: `${idx * 80}ms` }}
    >
      {/* Completion check — left rail */}
      <button
        onClick={onToggleDone}
        className={cn(
          "flex-shrink-0 w-14 flex items-center justify-center transition-colors",
          done ? "text-emerald-400" : "text-white/15 hover:text-white/40"
        )}
        aria-label={done ? "Marcar como não concluído" : "Marcar como concluído"}
      >
        <CheckCircle2 className="h-6 w-6" />
      </button>

      {/* Thumbnail */}
      <button
        onClick={onOpen}
        className="relative h-[88px] w-[88px] flex-shrink-0 overflow-hidden rounded-2xl bg-black/40 m-3 ml-0 active:scale-95 transition-transform"
      >
        {gifUrl.endsWith(".mp4") ? (
          <SecureVideo
            src={gifUrl}
            exerciseId={ex.exercicio_id}
            apiKey={RAPIDAPI_KEY}
            className="h-full w-full object-cover opacity-80"
            autoPlay loop muted playsInline
          />
        ) : ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1`}
            className="h-full w-full pointer-events-none opacity-80"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : (
          <img
            src={gifUrl}
            alt={ex.nome ?? "Exercício"}
            className="h-full w-full object-cover opacity-80"
            loading="lazy"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <PlayCircle className="h-8 w-8 text-white/80" />
        </div>
      </button>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-center gap-1.5 py-3 pr-3">
        {/* Name */}
        <p className={cn(
          "line-clamp-1 text-sm font-black tracking-tight uppercase",
          done ? "line-through text-muted-foreground" : "text-foreground"
        )}>
          {ex.nome}
        </p>

        {/* Muscle badge */}
        <Badge variant="outline" className={cn("w-fit text-[10px] font-bold capitalize py-0 px-2", muscleBadgeClass(ex.target_muscle))}>
          {muscleLabel}
        </Badge>

        {/* Equipment + sets×reps row */}
        <div className="flex items-center gap-3 mt-0.5">
          <EquipmentChip equipment={ex.equipment} />
          <div className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5">
            <Layers className="h-3 w-3 text-primary" />
            <span className="text-[11px] font-black text-primary">{ex.series} × {ex.repeticoes}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center justify-center gap-2 pr-3 py-3">
        {/* YouTube quick-play */}
        {ytId && (
          <button
            onClick={onYoutube}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            aria-label="Ver execução no YouTube"
          >
            <Youtube className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onOpen}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-muted-foreground hover:bg-white/10 transition-colors"
          aria-label="Ver detalhes"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const AlunoTreinosHojePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [criandoRotina, setCriandoRotina] = useState(false);
  const [exerciciosHoje, setExerciciosHoje] = useState<AgendaExercicioDia[]>([]);
  const [isRestDay, setIsRestDay] = useState(false);
  const [selected, setSelected] = useState<AgendaExercicioDia | null>(null);

  // Track which exercises are marked as done (local session state)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  // YouTube quick-play modal
  const [ytModalId, setYtModalId] = useState<string | null>(null);

  const hoje = useMemo(() => new Date(), []);
  const diaIndex = hoje.getDay();
  const hojeLabel = DIAS[diaIndex];

  const doneCount = doneIds.size;
  const totalCount = exerciciosHoje.length;
  // ── Local Storage Key ──────────────────────────────────────────────────────
  const [hojeStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  });

  const getStorageKey = () => `treino_concluido_${user?.id}_${hojeStr}`;

  // Hydrate doneIds from localStorage on mount
  useEffect(() => {
    if (!user) return;
    try {
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        setDoneIds(new Set(JSON.parse(saved)));
      }
    } catch (e) {
      console.error("Erro lendo localStorage", e);
    }
  }, [user, hojeStr]);

  // ── Toggle done ────────────────────────────────────────────────────────────
  const toggleDone = (id: string) => {
    setDoneIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);

      try {
        localStorage.setItem(getStorageKey(), JSON.stringify(Array.from(next)));
      } catch (e) {
        console.error("Erro salvando no localStorage", e);
      }

      return next;
    });
  };

  // ── Load / create schedule ─────────────────────────────────────────────────
  const carregarOuCriarAgenda = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: agendaExistente, error: agendaError } = await supabase
        .from("agenda_treinos")
        .select("id, dia_semana, exercicios")
        .eq("aluno_id", user.id);

      if (agendaError) throw agendaError;

      let agenda = (agendaExistente as AgendaTreinoRow[] | null) ?? [];

      if (!agenda.length) {
        setCriandoRotina(true);

        const { data: perfil } = await supabase
          .from("profiles")
          .select("objetivo")
          .eq("id", user.id)
          .maybeSingle();

        const objetivo = (perfil?.objetivo || "").toLowerCase();

        // ── Ler exercícios verificados pelo admin (exercises table) ────────
        let exQuery = (supabase as any)
          .from("exercises")
          .select("id, name, target_muscle, equipment, video_url, instrucoes")
          .eq("is_verified", true)
          .eq("is_active", true);

        if (objetivo.includes("massa")) {
          exQuery = exQuery.in("equipment", ["Barra", "Halter", "Cabo"]);
        }

        const { data: exerciciosBase, error: exError } = await exQuery.limit(100);
        if (exError) throw exError;

        let listaBase = (exerciciosBase as any[] | null) ?? [];

        if (!listaBase.length) {
          toast({
            title: "Sem exercícios disponíveis",
            description: "Nenhum exercício verificado encontrado. O administrador precisa aprovar exercícios primeiro.",
            variant: "destructive",
          });
          setIsRestDay(true); setExerciciosHoje([]); return;
        }

        const novaAgenda: Omit<AgendaTreinoRow, "id">[] = [];
        // Embaralha uma ÚNICA vez para distribuir ao longo da semana garantindo que não haja repetições.
        const listaEmbaralhada = [...listaBase].sort(() => Math.random() - 0.5);

        for (let offset = 0; offset < 7; offset++) {
          const dia = (diaIndex + offset) % 7;

          // Se for Domingo (0), não colocar exercícios por definição de dia de descanso.
          // O usuário quer treinar 6 dias? Normalmente domingo é descanso.
          // Caso a academia/rotina contemple domingo, nós poderíamos adaptar, mas manteremos dia 0 como descanso.
          if (dia === 0) { novaAgenda.push({ dia_semana: dia, exercicios: [] }); continue; }

          // Garante que o offset de fatiamento não estoure a lista se houver menos de 35 exercicios, 
          // caso contrário ele faz modulo wrap pra reciclar do começo.
          const exerciciosDoDia = [];
          for (let i = 0; i < 5; i++) {
            // Conta quantos dias 'preenchidos' tiveram (dias > 0) para o slice correto
            const stepAbsoluto = (offset * 5) + i;
            const indexCircular = stepAbsoluto % listaEmbaralhada.length;
            exerciciosDoDia.push(listaEmbaralhada[indexCircular]);
          }

          const selecionados: AgendaExercicioDia[] = exerciciosDoDia.map((ex: any) => ({
            exercicio_id: ex.id,
            nome: ex.name,           // exercises table uses "name" not "nome"
            body_part: ex.target_muscle ?? null,
            target_muscle: ex.target_muscle ?? null,
            equipment: ex.equipment ?? null,
            video_url: ex.video_url ?? null,
            instrucoes: ex.instrucoes ?? [],
            series: objetivo.includes("massa") ? 4 : 3,
            repeticoes: objetivo.includes("massa") ? 10 : 15,
          }));

          novaAgenda.push({ dia_semana: dia, exercicios: selecionados });
        }

        const { error: insertError } = await (supabase as any)
          .from("agenda_treinos")
          .insert(novaAgenda.map((row) => ({ aluno_id: user.id, dia_semana: row.dia_semana, exercicios: row.exercicios })));
        if (insertError) throw insertError;

        const { data: agendaNova, error: agendaNovaError } = await supabase
          .from("agenda_treinos").select("id, dia_semana, exercicios").eq("aluno_id", user.id);
        if (agendaNovaError) throw agendaNovaError;
        agenda = (agendaNova as AgendaTreinoRow[] | null) ?? [];

        toast({ title: "Rotina criada!", description: "Sua semana de treinos foi gerada automaticamente." });
      }

      const hojeRow = agenda.find((row) => row.dia_semana === diaIndex) || null;

      if (!hojeRow?.exercicios) { setIsRestDay(true); setExerciciosHoje([]); return; }

      const exerciciosBrutos = Array.isArray(hojeRow.exercicios) ? hojeRow.exercicios : [];
      if (!exerciciosBrutos.length) { setIsRestDay(true); setExerciciosHoje([]); return; }

      const exerciciosDia: AgendaExercicioDia[] = exerciciosBrutos.map((raw: any) => ({
        exercicio_id: raw.exercicio_id ?? raw.id,
        nome: raw.nome ?? null,
        body_part: raw.body_part ?? null,
        target_muscle: raw.target_muscle ?? null,
        equipment: raw.equipment ?? null,
        video_url: raw.video_url ?? raw.gifUrl ?? null,
        instrucoes: raw.instrucoes ?? [],
        series: raw.series ?? 3,
        repeticoes: raw.repeticoes ?? 15,
      }));

      // ── Enrich instrucoes from exercises table (admin curated guide) ──────
      // Only verified + active exercises are fetched — unverified ones are excluded.
      const exercicioIds = exerciciosDia
        .map((e) => e.exercicio_id)
        .filter(Boolean) as string[];

      let exerciciosFiltrados: AgendaExercicioDia[] = exerciciosDia;

      if (exercicioIds.length > 0) {
        const { data: enriched } = await (supabase as any)
          .from("exercises")
          .select("id, instrucoes, target_muscle, equipment, video_url")
          .in("id", exercicioIds)
          .eq("is_verified", true)
          .eq("is_active", true);

        if (enriched && Array.isArray(enriched)) {
          // Build a set of verified IDs to filter the agenda list
          const verifiedIds = new Set(enriched.map((e: any) => e.id));

          // Only show exercises that are verified in the exercises table
          exerciciosFiltrados = exerciciosDia.filter((ex) =>
            verifiedIds.has(ex.exercicio_id)
          );

          const enrichMap = new Map(enriched.map((e: any) => [e.id, e]));
          exerciciosFiltrados.forEach((ex) => {
            const found = enrichMap.get(ex.exercicio_id);
            if (!found) return;
            // Overwrite with curated data from exercises table
            if (found.instrucoes?.length) ex.instrucoes = found.instrucoes;
            if (found.target_muscle) ex.target_muscle = found.target_muscle;
            if (found.equipment) ex.equipment = found.equipment;
            if (found.video_url) ex.video_url = found.video_url;
          });
        } else {
          // If query returned nothing, show empty (all are unverified)
          exerciciosFiltrados = [];
        }
      }

      // ── Regeneração automática se os exercícios aprovados caírem ──────
      // Se a rotina original tinha pelo menos 5 exercícios, mas após o filtro dos
      // verificados sobraram menos de 5, significa que a curadoria mudou. 
      // Em vez de mostrar um treino "básico" de 2 exercícios, resetamos tudo.
      if (exerciciosDia.length >= 5 && exerciciosFiltrados.length < 5 && exerciciosFiltrados.length > 0) {
        toast({
          title: "Rotina atualizada",
          description: "A biblioteca de exercícios foi atualizada. Regenerando seu treino...",
        });
        // Delete agendas
        await supabase.from("agenda_treinos").delete().eq("aluno_id", user.id);
        // Recursively call to rebuild once
        // Small delay to let DB settle
        await new Promise(r => setTimeout(r, 500));
        await carregarOuCriarAgenda();
        return;
      }

      if (!exerciciosFiltrados.length) {
        setIsRestDay(true);
        setExerciciosHoje([]);
        return;
      }

      setIsRestDay(false);
      setExerciciosHoje(exerciciosFiltrados);
    } catch (error: any) {
      console.error("Erro ao carregar treinos do dia", error);
      toast({ title: "Erro nos treinos do dia", description: error.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setCriandoRotina(false);
      setLoading(false);
    }
  };

  useEffect(() => { void carregarOuCriarAgenda(); }, [user]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <main className="safe-bottom-main flex min-h-screen flex-col bg-background px-4 pb-32 pt-6">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackIconButton to="/aluno/dashboard" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Treino de Hoje</p>
            <h1 className="page-title-gradient text-3xl font-black tracking-tighter">{hojeLabel}</h1>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-primary">
          <Dumbbell className="h-5 w-5" />
        </div>
      </header>

      {/* ── Loading ── */}
      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10">
            <Dumbbell className="h-7 w-7 animate-pulse text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            {criandoRotina ? "Gerando sua rotina semanal…" : "Carregando treino de hoje…"}
          </p>
        </div>

        /* ── Rest day ── */
      ) : isRestDay ? (
        <section className="mt-4 flex flex-1 flex-col items-center justify-center text-center gap-6">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-[32px] bg-primary/10 text-primary shadow-2xl shadow-primary/20">
              <Zap className="h-10 w-10" />
            </div>
            <div className="absolute -right-2 -top-2 flex h-8 w-8 animate-bounce items-center justify-center rounded-full bg-background border border-border shadow-lg">
              <span className="text-xs">🧘</span>
            </div>
          </div>

          {/* Empty state body */}
          <div className="max-w-[280px] space-y-3">
            <h2 className="text-xl font-black tracking-tight text-foreground uppercase tracking-widest">Recuperação Ativa</h2>
            <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl">
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                Hoje é seu dia de descanso programado. Use esse tempo para alongar, caminhar leve ou recarregar as energias.
              </p>
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Músculos em consolidação</p>
              </div>
            </div>
          </div>

          {/* Generate workout CTA */}
          <div className="flex flex-col items-center gap-3 w-full max-w-[280px]">
            <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Ou prefere treinar mesmo assim?</span>
            </div>
            <Button
              onClick={async () => {
                if (!user) return;
                setCriandoRotina(true);
                try {
                  // Delete current schedule so it regenerates
                  await supabase.from("agenda_treinos").delete().eq("aluno_id", user.id);
                  await carregarOuCriarAgenda();
                } catch (e: any) {
                  toast({ title: "Erro ao gerar treino", description: e.message, variant: "destructive" });
                } finally {
                  setCriandoRotina(false);
                }
              }}
              disabled={criandoRotina}
              className="w-full gap-2 rounded-2xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
            >
              {criandoRotina ? <Dumbbell className="h-4 w-4 animate-pulse" /> : <RotateCcw className="h-4 w-4" />}
              Gerar Treino Agora
            </Button>
          </div>
        </section>

        /* ── Exercise list ── */
      ) : (
        <section className="space-y-4">
          {/* Progress bar header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              Hoje · {exerciciosHoje.length} exercícios
            </span>
            <span className={cn(
              "text-[11px] font-black uppercase tracking-wider",
              allDone ? "text-emerald-400" : "text-primary"
            )}>
              {doneCount}/{totalCount} concluídos
            </span>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  allDone ? "bg-emerald-500" : "bg-primary"
                )}
                style={{ width: `${(doneCount / totalCount) * 100}%` }}
              />
            </div>
          )}

          {/* All done celebration */}
          {allDone && (
            <div className="rounded-[20px] border border-emerald-500/30 bg-emerald-500/10 p-4 text-center animate-in fade-in zoom-in-95 duration-300">
              <p className="text-sm font-black text-emerald-400">🎉 Treino completo! Ótimo trabalho!</p>
            </div>
          )}

          {/* Cards */}
          <div className="space-y-3">
            {exerciciosHoje.map((ex, idx) => {
              const ytId = getYouTubeId(ex.video_url ?? "");
              return (
                <ExerciseCard
                  key={ex.exercicio_id}
                  ex={ex}
                  idx={idx}
                  done={doneIds.has(ex.exercicio_id)}
                  onToggleDone={() => toggleDone(ex.exercicio_id)}
                  onOpen={() => setSelected(ex)}
                  onYoutube={() => ytId && setYtModalId(ytId)}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ── YouTube Quick Modal ── */}
      {ytModalId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setYtModalId(null)}
        >
          <div className="relative w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setYtModalId(null)}
              className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="aspect-video w-full overflow-hidden rounded-[24px] border border-white/10 shadow-2xl">
              <iframe
                src={`https://www.youtube.com/embed/${ytModalId}?autoplay=1&modestbranding=1&rel=0`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Bottom Sheet ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-300">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setSelected(null)} />
          <section className="safe-bottom-content relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-[40px] border-t border-white/10 bg-[#182229]/95 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-500 fill-mode-both">
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/10 mb-6" />

            <div className="px-6 pb-12">
              {/* Title row */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Player de Exercício</p>
                  <h2 className="text-2xl font-black leading-tight text-foreground uppercase tracking-tight">{selected.nome}</h2>
                  <Badge variant="outline" className={cn("text-[10px] font-bold capitalize", muscleBadgeClass(selected.target_muscle))}>
                    {selected.target_muscle || selected.body_part || "Força"}
                  </Badge>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-muted-foreground shrink-0">
                  <Target className="h-6 w-6" />
                </div>
              </div>

              {/* Video player */}
              <div className="relative mb-5 overflow-hidden rounded-[32px] border border-white/10 bg-black/40">
                {(() => {
                  const gifUrl = selected.video_url ?? defaultExerciseImage;
                  const ytId = getYouTubeId(gifUrl);
                  if (gifUrl.endsWith(".mp4")) {
                    return (
                      <SecureVideo
                        src={gifUrl} exerciseId={selected.exercicio_id} apiKey={RAPIDAPI_KEY}
                        className="aspect-video w-full object-cover"
                        autoPlay loop muted playsInline controls={false}
                      />
                    );
                  }
                  if (ytId) {
                    return (
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0&loop=1&playlist=${ytId}&modestbranding=1`}
                        className="aspect-video w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  }
                  return <img src={gifUrl} alt={selected.nome ?? ""} className="aspect-video w-full object-cover" loading="lazy" />;
                })()}

                {/* Overlay pills */}
                <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                  <div className="flex items-center gap-2 rounded-2xl bg-black/60 px-4 py-2 backdrop-blur-md">
                    <Layers className="h-4 w-4 text-primary" />
                    <span className="text-xs font-black text-white">{selected.series} séries</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-black/60 px-4 py-2 backdrop-blur-md">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="text-xs font-black text-white">{selected.repeticoes} reps</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-black/60 px-4 py-2 backdrop-blur-md">
                    <Weight className="h-4 w-4 text-primary" />
                    <span className="text-xs font-black text-white capitalize">{selected.equipment || "Livre"}</span>
                  </div>
                </div>
              </div>

              {/* Sets/reps cards */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: "Séries", value: String(selected.series), icon: <Layers className="h-4 w-4 text-primary" /> },
                  { label: "Repetições", value: String(selected.repeticoes), icon: <Activity className="h-4 w-4 text-primary" /> },
                  { label: "Equipamento", value: selected.equipment || "Livre", icon: <Weight className="h-4 w-4 text-primary" /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 rounded-3xl border border-white/5 bg-white/[0.03] p-3 text-center">
                    {icon}
                    <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">{label}</span>
                    <span className="text-sm font-black text-foreground capitalize">{value}</span>
                  </div>
                ))}
              </div>

              {/* Instructions — collapsible Accordion, closed by default */}
              {selected.instrucoes && selected.instrucoes.length > 0 && (
                <Accordion type="single" collapsible className="w-full mb-6">
                  <AccordionItem value="guide" className="rounded-[20px] border border-white/5 bg-white/[0.02] px-4 overflow-hidden">
                    <AccordionTrigger className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 hover:no-underline py-3">
                      <div className="flex items-center gap-2">
                        <Info className="h-3 w-3" /> Guia de Execução
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-3">
                        {translateInstructions(selected.instrucoes).map((step, idx) => (
                          <div key={idx} className="flex gap-3 items-start border-l border-white/5 pl-3">
                            <span className="text-[10px] font-black text-primary/40 pt-0.5 shrink-0">{String(idx + 1).padStart(2, "00")}</span>
                            <p className="text-xs leading-relaxed text-muted-foreground">{step}</p>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {/* CTA buttons */}
              <div className="flex flex-col gap-3">
                <Button
                  className="variant-premium w-full py-8 text-sm font-black uppercase tracking-widest rounded-3xl"
                  onClick={async () => {
                    if (!user) return;
                    const { data, error } = await (supabase as any)
                      .from("workout_sessions")
                      .insert({
                        user_id: user.id,
                        exercise_name: selected.nome || "Treino Academia",
                        target_muscles: selected.target_muscle ? [selected.target_muscle] : null,
                        series: selected.series,
                        repetitions: selected.repeticoes,
                        status: "em_andamento",
                        iniciado_em: new Date().toISOString(),
                      })
                      .select()
                      .single();

                    if (error) {
                      toast({ title: "Erro ao iniciar", description: error.message, variant: "destructive" });
                      return;
                    }
                    navigate("/aluno/treino-ativo", { state: { sessaoId: data.id, exercicio: selected } });
                  }}
                >
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Iniciar Série
                </Button>

                {/* Mark done directly from sheet */}
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full py-5 text-[11px] font-black uppercase tracking-widest gap-2 rounded-2xl border transition-colors",
                    doneIds.has(selected.exercicio_id)
                      ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      : "border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                  onClick={() => toggleDone(selected.exercicio_id)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {doneIds.has(selected.exercicio_id) ? "Concluído ✓" : "Marcar como Concluído"}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
                  onClick={() => setSelected(null)}
                >
                  Continuar explorando
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      <FloatingNavIsland />
    </main>
  );
};

export default AlunoTreinosHojePage;
