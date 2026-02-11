import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
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
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivityContext } from "@/hooks/useActivityContext";
import { cacheActivityList, getCachedActivityList } from "@/lib/offlineQueue";

interface Atividade {
  id: string;
  nome: string;
  descricao: string;
  icone: any;
  calorias: string;
  intensidade: "Baixa" | "Moderada" | "Alta" | "Muito Alta";
  cor: string;
}

import { ACTIVITY_TYPES, ActivityType, getActivityTypeById } from "@/lib/activityTypes";

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
    <main className="min-h-screen bg-background pb-20">
      {/* Header fixo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border/40 px-4 py-3 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/aluno/dashboard")}
            className="h-9 w-9"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="page-title-gradient text-lg font-semibold">Escolher Atividade</h1>
            <p className="text-xs text-muted-foreground">Selecione sua atividade do momento</p>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <div className="pt-20 px-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activityCards.map((atividade) => {
            const IconeAtividade = atividade.icone;
            return (
              <Card
                key={atividade.id}
                className="relative group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-border/60 bg-card/80 overflow-hidden"
                onClick={() => {
                  if (startingActivityId === atividade.id) return;
                  iniciarAtividade(atividade);
                }}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${atividade.cor} opacity-50 group-hover:opacity-70 transition-opacity pointer-events-none`}
                />
                <CardContent className="relative z-10 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/80 shadow-md">
                      <IconeAtividade className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant={getIntensidadeBadgeVariant(atividade.intensidade)} className="text-[10px]">
                      {atividade.intensidade}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">{atividade.nome}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{atividade.descricao}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      {atividade.calorias}
                    </p>
                  </div>

                  <Button
                    variant="default"
                    size="sm"
                    className="w-full relative z-20"
                    loading={startingActivityId === atividade.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (startingActivityId === atividade.id) return;
                      iniciarAtividade(atividade);
                    }}
                  >
                    Iniciar
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border border-accent/40 bg-card/80 mt-6">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Dica:</strong> Escolha a atividade que mais combina com seu objetivo e nível de energia atual.
              Você pode alternar entre diferentes atividades ao longo da semana para resultados melhores.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default AlunoAtividadeMomentoPage;
