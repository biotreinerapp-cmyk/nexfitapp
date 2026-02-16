import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CircleDot,
  Dumbbell,
  Footprints,
  Bike,
  Waves,
  TreePine,
  Zap,
  Heart,
  Flame,
  Wind,
  Mountain,
  Lock,
  ChevronRight,
  Activity
} from "lucide-react";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivityContext } from "@/hooks/useActivityContext";
import { cacheActivityList, getCachedActivityList } from "@/lib/offlineQueue";
import { getActivityTypeById, ACTIVITY_TYPES, ActivityType } from "@/lib/activityTypes";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { useUserPlan } from "@/hooks/useUserPlan";

interface Atividade {
  id: string;
  nome: string;
  descricao: string;
  icone: any;
  calorias: string;
  intensidade: "Baixa" | "Moderada" | "Alta" | "Muito Alta";
  cor: string;
}

const DEFAULT_ATIVIDADES: Atividade[] = [
  {
    id: "corrida",
    nome: "Corrida",
    descricao: "Exercício cardiovascular de alto impacto",
    icone: Footprints,
    calorias: "400-600 cal/h",
    intensidade: "Alta",
    cor: "from-primary/20 to-primary/5",
  },
  {
    id: "musculacao",
    nome: "Musculação",
    descricao: "Treino de força e hipertrofia",
    icone: Dumbbell,
    calorias: "200-400 cal/h",
    intensidade: "Moderada",
    cor: "from-secondary/20 to-secondary/5",
  },
  {
    id: "ciclismo",
    nome: "Ciclismo",
    descricao: "Pedalar ao ar livre ou indoor",
    icone: Bike,
    calorias: "300-500 cal/h",
    intensidade: "Moderada",
    cor: "from-accent/20 to-accent/5",
  },
  {
    id: "natacao",
    nome: "Natação",
    descricao: "Exercício de baixo impacto completo",
    icone: Waves,
    calorias: "400-700 cal/h",
    intensidade: "Alta",
    cor: "from-muted/30 to-muted/10",
  },
  {
    id: "caminhada",
    nome: "Caminhada",
    descricao: "Atividade aeróbica leve",
    icone: TreePine,
    calorias: "150-250 cal/h",
    intensidade: "Baixa",
    cor: "from-primary/10 to-primary/5",
  },
  {
    id: "hiit",
    nome: "HIIT",
    descricao: "Treino intervalado de alta intensidade",
    icone: Zap,
    calorias: "500-800 cal/h",
    intensidade: "Muito Alta",
    cor: "from-destructive/20 to-destructive/5",
  },
  {
    id: "yoga",
    nome: "Yoga",
    descricao: "Flexibilidade e equilíbrio mental",
    icone: Heart,
    calorias: "150-300 cal/h",
    intensidade: "Baixa",
    cor: "from-secondary/15 to-secondary/5",
  },
  {
    id: "funcional",
    nome: "Funcional",
    descricao: "Movimentos naturais do corpo",
    icone: CircleDot,
    calorias: "300-500 cal/h",
    intensidade: "Moderada",
    cor: "from-accent/15 to-accent/5",
  },
  {
    id: "crossfit",
    nome: "CrossFit",
    descricao: "Treino de alta intensidade variado",
    icone: Flame,
    calorias: "600-900 cal/h",
    intensidade: "Muito Alta",
    cor: "from-destructive/25 to-destructive/10",
  },
  {
    id: "pilates",
    nome: "Pilates",
    descricao: "Fortalecimento do core e postura",
    icone: Wind,
    calorias: "200-350 cal/h",
    intensidade: "Baixa",
    cor: "from-muted/25 to-muted/10",
  },
  {
    id: "trilha",
    nome: "Trilha",
    descricao: "Caminhada ou corrida em natureza",
    icone: Mountain,
    calorias: "350-550 cal/h",
    intensidade: "Moderada",
    cor: "from-primary/15 to-primary/5",
  },
];

const AlunoAtividadeMomentoPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { plan } = useUserPlan();
  const { setCurrentActivity } = useActivityContext();
  const [startingActivityId, setStartingActivityId] = useState<string | null>(null);
  const [activityCards, setActivityCards] = useState<Atividade[]>(DEFAULT_ATIVIDADES);

  useEffect(() => {
    const initCache = async () => {
      // Se estiver offline, tenta carregar do cache (evita “tela branca” caso no futuro
      // a lista seja dinâmica). Se não existir cache, cai para o default embutido.
      if (!navigator.onLine) {
        const cached = await getCachedActivityList("explorar_atividades");
        if (Array.isArray(cached) && cached.length > 0) {
          setActivityCards(cached as Atividade[]);
        }
        return;
      }

      // Online: mantém o cache sempre “quentinho”.
      await cacheActivityList("explorar_atividades", DEFAULT_ATIVIDADES);
      await cacheActivityList("activity_types", ACTIVITY_TYPES);
    };

    void initCache();
  }, []);

  const getIntensidadeBadgeVariant = (intensidade: string) => {
    switch (intensidade) {
      case "Baixa":
        return "secondary";
      case "Moderada":
        return "default";
      case "Alta":
        return "destructive";
      case "Muito Alta":
        return "destructive";
      default:
        return "default";
    }
  };

  const iniciarAtividade = async (atividade: Atividade) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para iniciar uma atividade.",
        variant: "destructive",
      });
      return;
    }

    setStartingActivityId(atividade.id);

    const activityType: ActivityType | null = getActivityTypeById(atividade.id);

    // Atualiza estado global de atividade selecionada para a IA contextual
    setCurrentActivity({
      id: atividade.id,
      name: atividade.nome,
      category: activityType?.category ?? "estacionario",
      usesGps: activityType?.usesGps ?? false,
      usesDistance: activityType?.usesDistance ?? false,
    });

    // OFFLINE-FIRST: permite iniciar monitoramento sem criar sessão no Supabase.
    if (!navigator.onLine) {
      const offlineSessionId =
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

      toast({
        title: `${atividade.nome} iniciada (offline)`,
        description: "Você pode treinar normalmente. Vamos sincronizar quando a conexão voltar.",
      });

      navigate("/aluno/monitoramento-tempo-real", {
        state: { sessaoId: offlineSessionId, atividadeNome: atividade.nome, activityType },
      });

      setStartingActivityId(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("atividade_sessao")
        .insert({
          user_id: user.id,
          tipo_atividade: atividade.nome,
          status: "em_andamento",
          iniciado_em: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Erro ao iniciar atividade",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: `${atividade.nome} iniciada!`,
        description: "Boa sorte no seu treino!",
      });

      navigate("/aluno/monitoramento-tempo-real", {
        state: { sessaoId: data.id, atividadeNome: atividade.nome, activityType },
      });
    } catch (error) {
      console.error("Erro ao iniciar atividade:", error);
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setStartingActivityId(null);
    }
  };

  return (
    <main className="safe-bottom-main flex min-h-screen flex-col bg-background px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackIconButton to="/aluno/dashboard" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Explorar Atividades</p>
            <h1 className="page-title-gradient text-2xl font-black tracking-tight uppercase leading-none">Qual seu foco agora?</h1>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-primary">
          <Activity className="h-5 w-5" />
        </div>
      </header>

      <div className="mt-2 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          {activityCards.map((atividade, idx) => {
            const IconeAtividade = atividade.icone;
            const isFreeAllowed = ["corrida", "musculacao", "ciclismo"].includes(atividade.id);
            const isDisabled = plan === "FREE" && !isFreeAllowed;

            return (
              <div
                key={atividade.id}
                className={cn(
                  "group relative overflow-hidden rounded-[28px] border border-white/5 bg-gradient-to-br from-white/[0.05] to-transparent p-5 backdrop-blur-xl transition-all active:scale-[0.98]",
                  "animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both",
                  isDisabled ? "opacity-60 grayscale-[0.8]" : "cursor-pointer"
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
                onClick={() => {
                  if (isDisabled) {
                    toast({
                      title: "Atividade Premium",
                      description: "Faça upgrade para o plano Advance ou Elite para liberar esta atividade.",
                    });
                    return;
                  }
                  if (startingActivityId === atividade.id) return;
                  iniciarAtividade(atividade);
                }}
              >
                {/* Background Decorativo */}
                <div className={`absolute -right-4 -top-4 h-24 w-24 bg-gradient-to-br ${atividade.cor} blur-2xl opacity-20 group-hover:opacity-40 transition-opacity`} />

                <div className="relative z-10 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-primary">
                      <IconeAtividade className="h-5 w-5" />
                    </div>
                    {isDisabled && (
                      <div className="rounded-full bg-black/40 p-1.5 border border-white/10 backdrop-blur-md">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-foreground uppercase tracking-tight leading-none">{atividade.nome}</h3>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{atividade.intensidade}</p>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <Flame className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                      {atividade.calorias.split(' ')[0]}
                    </span>
                  </div>
                </div>

                {startingActivityId === atividade.id && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-[32px] border border-white/5 bg-white/[0.02] p-6 text-center backdrop-blur-md">
          <p className="text-[11px] font-medium leading-relaxed text-muted-foreground/80">
            <span className="font-black text-primary uppercase tracking-widest">Dica:</span> Escolha a atividade que mais combina com seu objetivo. Rotacionar treinos acelera resultados.
          </p>
        </div>
      </div>
      <FloatingNavIsland />
    </main>
  );
};

export default AlunoAtividadeMomentoPage;
