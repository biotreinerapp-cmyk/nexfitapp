import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BackIconButton } from "@/components/navigation/BackIconButton";
const AlunoProgressoPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [treinosSemana, setTreinosSemana] = useState(0);
  const [caloriasSemana, setCaloriasSemana] = useState(0);
  const [minutosSemana, setMinutosSemana] = useState(0);
  const [treinosSemanaAnterior, setTreinosSemanaAnterior] = useState(0);

  useEffect(() => {
    document.title = "Evolução - Nexfit";

    if (!user) return;

    const carregarTreinosSemana = async () => {
      const hoje = new Date();
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(hoje.getDate() - 6);
      const catorzeDiasAtras = new Date();
      catorzeDiasAtras.setDate(hoje.getDate() - 13);

      const [cardioResp, muscuResp] = await Promise.all([
        (supabase as any)
          .from("atividade_sessao")
          .select("id, iniciado_em, finalizado_em, calorias_estimadas")
          .eq("user_id", user.id)
          .eq("status", "finalizada")
          .gte("iniciado_em", catorzeDiasAtras.toISOString()),
        (supabase as any)
          .from("workout_sessions")
          .select("id, iniciado_em, finalizado_em, calorias_estimadas")
          .eq("user_id", user.id)
          .eq("status", "finalizada")
          .gte("iniciado_em", catorzeDiasAtras.toISOString()),
      ]);

      const cardioData = (cardioResp.data as any[] | null) ?? [];
      const muscuData = (muscuResp.data as any[] | null) ?? [];

      const calcularMinutos = (iniciado_em?: string | null, finalizado_em?: string | null) => {
        if (!iniciado_em || !finalizado_em) return 0;
        const inicio = new Date(iniciado_em);
        const fim = new Date(finalizado_em);
        return Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / 60000));
      };

      const todasSessoes = [...cardioData, ...muscuData];

      let treinosSemanaAtual = 0;
      let treinosSemanaPassada = 0;
      let minutosSemanaAtual = 0;
      let caloriasSemanaAtual = 0;

      todasSessoes.forEach((sessao) => {
        const { iniciado_em, finalizado_em, calorias_estimadas } = sessao as any;
        if (!iniciado_em) return;

        const inicio = new Date(iniciado_em);
        const minutos = calcularMinutos(iniciado_em, finalizado_em);

        if (inicio >= seteDiasAtras && inicio <= hoje) {
          treinosSemanaAtual += 1;
          minutosSemanaAtual += minutos;
          caloriasSemanaAtual += calorias_estimadas ?? 0;
        } else if (inicio >= catorzeDiasAtras && inicio < seteDiasAtras) {
          treinosSemanaPassada += 1;
        }
      });

      setTreinosSemana(treinosSemanaAtual);
      setTreinosSemanaAnterior(treinosSemanaPassada);
      setMinutosSemana(minutosSemanaAtual);
      setCaloriasSemana(caloriasSemanaAtual);
    };

    carregarTreinosSemana();
  }, [user]);

  const metaSemanal = 4;
  const progressoConsistencia = Math.min(100, (treinosSemana / metaSemanal) * 100);
  const mensagemResumoSemana = (() => {
    if (treinosSemana === 0 && treinosSemanaAnterior === 0) {
      return "Você ainda não concluiu treinos nas últimas semanas. Que tal começar com um treino leve?";
    }

    if (treinosSemana > treinosSemanaAnterior) {
      return "Você treinou mais do que na semana passada. Ótimo progresso.";
    }

    if (treinosSemana === treinosSemanaAnterior) {
      return "Você manteve sua frequência de treinos. Continue.";
    }

    return "Você treinou menos do que na semana passada. Vamos retomar o ritmo?";
  })();

  return (
    <main className="safe-bottom-floating-nav flex min-h-screen flex-col bg-background px-4 pt-6">
      {/* Header padrão da Área do Aluno */}
      <header className="mb-4 flex items-center gap-3">
        <BackIconButton to="/aluno/dashboard" />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent-foreground/80">Área do Aluno</p>
          <h1 className="mt-1 page-title-gradient text-2xl font-semibold">Evolução</h1>
          <p className="mt-1 text-xs text-muted-foreground">Acompanhe sua consistência, força e progresso ao longo do tempo.</p>
        </div>
      </header>

      {/* Seção de consistência semanal */}
      <section className="flex-1 space-y-4 pb-4">
        {/* Seção de consistência semanal */}
        <div className="space-y-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Consistência semanal</h2>
            <p className="text-xs text-muted-foreground">
              Manter a frequência é o primeiro passo para evoluir.
            </p>
          </div>

          <Card className="border border-accent/40 bg-card/80">
            <CardContent className="space-y-4 p-4">
              {/* Linha principal: total de treinos */}
              <div className="flex items-baseline justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent-foreground/80">
                    Treinos nesta semana
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Somando cardio e força, considerando todos os treinos finalizados.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Total</p>
                  <p className="text-2xl font-semibold text-foreground leading-none">
                    {treinosSemana}
                  </p>
                </div>
              </div>

              {/* Linha secundária: minutos e calorias */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="rounded-md border border-border/60 bg-background/40 p-3">
                  <p className="text-[11px] text-muted-foreground">Minutos de treino na semana</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {minutosSemana}
                  </p>
                </div>
                <div className="rounded-md border border-border/60 bg-background/40 p-3 text-right">
                  <p className="text-[11px] text-muted-foreground">Calorias estimadas na semana</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {caloriasSemana}
                  </p>
                </div>
              </div>

              {/* Barra de progresso da meta */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Meta semanal</span>
                  <span>
                    {treinosSemana}/{metaSemanal} treinos
                  </span>
                </div>
                <Progress value={progressoConsistencia} className="h-2" />
                <p className="text-[10px] text-muted-foreground">
                  Meta padrão: {metaSemanal} treinos por semana. Mesmo 1 treino já conta como progresso.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumo da semana - análise comparativa */}
        <div className="space-y-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Resumo da semana</h2>
            <p className="text-xs text-muted-foreground">
              Comparação dos últimos 7 dias com a semana anterior.
            </p>
          </div>

          <Card className="border border-accent/40 bg-card/80">
            <CardContent className="space-y-4 p-4">
              {/* Linha principal: comparação de treinos */}
              <div className="flex items-baseline justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent-foreground/80">
                    Frequência comparativa
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Total de treinos finalizados (cardio e força) nos últimos 7 dias.
                  </p>
                </div>

                <div className="text-right text-xs">
                  <div className="flex items-end justify-end gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Esta semana</p>
                      <p className="text-xl font-semibold text-foreground leading-none">
                        {treinosSemana}
                      </p>
                    </div>
                    <div className="h-8 w-px bg-border/70" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Semana passada</p>
                      <p className="text-xl font-semibold text-foreground leading-none">
                        {treinosSemanaAnterior}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mensagem de impacto */}
              <div className="rounded-md border border-border/60 bg-background/40 p-3">
                <p className="text-[11px] font-medium text-foreground">
                  Sua evolução recente
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  {mensagemResumoSemana}
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Baseado em todos os treinos finalizados dos últimos 7 dias em comparação com a
                  semana anterior.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
};

export default AlunoProgressoPage;
