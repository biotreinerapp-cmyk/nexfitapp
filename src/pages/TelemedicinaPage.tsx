import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Apple,
  ArrowLeft,
  Brain,
  Dumbbell,
  HeartPulse,
  Stethoscope,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useToast } from "@/hooks/use-toast";
import { HubServiceButton } from "@/components/dashboard/HubServiceButton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const HORARIOS_DISPONIVEIS = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00"] as const;
type HorarioDisponivel = (typeof HORARIOS_DISPONIVEIS)[number];

const getServicoIcon = (slug: string) => {
  const key = (slug || "").toLowerCase();

  // Mapeamento simples por slug/palavras-chave (pode ajustar conforme seus slugs reais)
  if (key.includes("cardio") || key.includes("coracao") || key.includes("coração")) return HeartPulse;
  if (key.includes("neuro") || key.includes("mente") || key.includes("psico")) return Brain;
  if (key.includes("nutri") || key.includes("aliment") || key.includes("dieta")) return Apple;
  if (key.includes("fisio") || key.includes("treino") || key.includes("ortop")) return Dumbbell;

  return Stethoscope;
};

interface TelemedServico {
  id: string;
  nome: string;
  slug: string;
  icone: string | null;
  icon_url: string | null;
}

interface TelemedProfissional {
  id: string;
  nome: string;
  bio: string | null;
  preco_base: number | null;
  disponivel: boolean | null;
  servico_id: string | null;
}

const TelemedicinaPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasTelemedAccess, isMaster, plan } = useUserPlan();
  const { toast } = useToast();

  const [servicos, setServicos] = useState<TelemedServico[]>([]);
  const [profissionais, setProfissionais] = useState<TelemedProfissional[]>([]);
  const [loading, setLoading] = useState(true);

  const [agendaOpen, setAgendaOpen] = useState(false);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<TelemedProfissional | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<Date | undefined>();
  const [horaSelecionada, setHoraSelecionada] = useState<HorarioDisponivel | null>(null);
  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false);

  const podeAcessar = isMaster || hasTelemedAccess;

  useEffect(() => {
    const carregarDados = async () => {
      if (!user) return;
      setLoading(true);

      const [{ data: servicosData }, { data: profData }] = await Promise.all([
        supabase
          .from("telemedicina_servicos")
          .select("id, nome, slug, icone, icon_url, ativo")
          .eq("ativo", true)
          .order("nome"),
        supabase
          .from("telemedicina_profissionais")
          .select("id, nome, bio, preco_base, disponivel, servico_id")
          .eq("disponivel", true)
          .order("nome"),
      ]);

      setServicos((servicosData as any) ?? []);
      setProfissionais((profData as any) ?? []);
      setLoading(false);
    };

    carregarDados();
  }, [user]);

  const resetAgendaState = () => {
    setDataSelecionada(undefined);
    setHoraSelecionada(null);
    setProfissionalSelecionado(null);
  };

  const handleAbrirAgenda = (profissional: TelemedProfissional) => {
    if (!podeAcessar) return;
    setProfissionalSelecionado(profissional);
    setAgendaOpen(true);
  };

  const handleConfirmarAgendamento = async () => {
    if (!user || !profissionalSelecionado || !dataSelecionada || !horaSelecionada) return;

    const [hora, minuto] = horaSelecionada.split(":").map(Number);
    const data = new Date(dataSelecionada);
    data.setHours(hora, minuto, 0, 0);

    setSalvandoAgendamento(true);

    const { error } = await supabase.from("telemedicina_agendamentos").insert({
      aluno_id: user.id,
      profissional_id: profissionalSelecionado.id,
      profissional_nome: profissionalSelecionado.nome,
      data_hora: data.toISOString(),
      status: "pendente",
    });

    setSalvandoAgendamento(false);

    if (error) {
      toast({
        title: "Não foi possível agendar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Consulta agendada", description: "Seu agendamento foi registrado com sucesso." });
    resetAgendaState();
    setAgendaOpen(false);
  };

  if (!podeAcessar && plan === "FREE") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border border-accent/40 bg-card/90 p-6 text-xs">
          <h1 className="mb-1 text-base font-semibold text-foreground">Telemedicina bloqueada</h1>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Telemedicina está disponível apenas no plano <span className="font-semibold text-primary">+SAÚDE PRO</span>.
          </p>
          <p className="mb-4 text-[11px] text-muted-foreground">
            Faça o upgrade para desbloquear consultas remotas com especialistas.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" size="lg" onClick={() => navigate("/aluno/dashboard")}>
              Ver planos disponíveis
            </Button>
            <Button
              className="flex-1"
              size="lg"
              variant="outline"
              onClick={() => navigate("/aluno/dashboard")}
            >
              Voltar ao dashboard
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-background px-4 pb-6 pt-6">
      <header className="mb-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="mr-1 text-foreground"
          onClick={() => navigate("/aluno/dashboard")}
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent-foreground/80">Telemedicina</p>
          <h1 className="mt-1 page-title-gradient text-2xl font-semibold">
            Serviços Online
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Escolha o serviço e agende sua consulta remota.
          </p>
        </div>
      </header>

      <section className="mb-4 space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Serviços por especialidade
        </h2>
        {loading ? (
          <p className="text-[11px] text-muted-foreground">Carregando serviços...</p>
        ) : servicos.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Nenhum serviço de telemedicina cadastrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {servicos.map((servico) => {
              const relacionados = profissionais.filter((p) => p.servico_id === servico.id);

              return (
                <div key={servico.id} className="space-y-3">
                  {/* Botão do serviço (visual apenas) */}
                  <HubServiceButton
                    title={servico.nome}
                    icon={getServicoIcon(servico.slug)}
                    onClick={() => {
                      // Mantém a mesma funcionalidade (item informativo)
                    }}
                    className="pointer-events-none rounded-2xl px-4 py-4"
                  />

                  {relacionados.length > 0 ? (
                    <div className="space-y-3">
                      {relacionados.map((prof) => (
                        <HubServiceButton
                          key={prof.id}
                          title={prof.nome}
                          icon={User}
                          onClick={() => handleAbrirAgenda(prof)}
                          className="rounded-2xl px-4 py-4"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Dialog
        open={agendaOpen}
        onOpenChange={(open) => {
          setAgendaOpen(open);
          if (!open) {
            resetAgendaState();
          }
        }}
      >
        <DialogContent className="max-w-sm border border-accent/40 bg-card/95">
          <DialogHeader>
            <DialogTitle className="text-sm">Agendar consulta</DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground">
              Selecione a data e o horário desejados para sua consulta remota.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-foreground">
              {profissionalSelecionado ? profissionalSelecionado.nome : "Selecione um profissional"}
            </p>
            <Calendar
              mode="single"
              selected={dataSelecionada}
              onSelect={setDataSelecionada}
              className="pointer-events-auto rounded-lg border border-border/60 bg-background"
              disabled={(date) => date < new Date()}
            />
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">Horários disponíveis</p>
              <div className="flex flex-wrap gap-2">
                {HORARIOS_DISPONIVEIS.map((horario) => (
                  <Button
                    key={horario}
                    type="button"
                    size="sm"
                    variant={horaSelecionada === horario ? "default" : "outline"}
                    className="h-10 rounded-full px-5 text-xs"
                    onClick={() => setHoraSelecionada(horario)}
                  >
                    {horario}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 rounded-full px-8 text-sm"
              onClick={() => {
                setAgendaOpen(false);
                resetAgendaState();
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-11 rounded-full px-8 text-sm"
              loading={salvandoAgendamento}
              disabled={!dataSelecionada || !horaSelecionada}
              onClick={handleConfirmarAgendamento}
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default TelemedicinaPage;
