import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AdminPage = () => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleResyncExercises = async () => {
    try {
      setIsSyncing(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        toast({
          title: "Sessão inválida",
          description: "Faça login novamente antes de re-sincronizar a biblioteca de exercícios.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("sync-exercises", {});

      if (error) {
        console.error("Erro ao re-sincronizar biblioteca de exercícios", error);
        toast({
          title: "Erro ao re-sincronizar",
          description: "Não foi possível atualizar a biblioteca de exercícios. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Biblioteca atualizada",
        description: `Foram importados ${data?.imported ?? 0} exercícios com GIF da ExerciseDB.`,
      });
    } catch (err: any) {
      console.error("Erro inesperado ao re-sincronizar exercícios", err);
      toast({
        title: "Erro inesperado",
        description: err?.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border border-accent/40 bg-card/80 text-left">
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-primary to-accent bg-clip-text text-2xl font-semibold text-transparent">
            Painel Admin Master (AUREVO)
          </CardTitle>
          <CardDescription>
            Área de gestão avançada de inquilinos, planos e métricas globais. Em breve com dados reais do Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-muted-foreground">
          <div className="flex items-baseline justify-between">
            <span>Usuários ativos</span>
            <span className="text-lg font-semibold text-primary">1.200</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span>Faturamento total</span>
            <span className="text-lg font-semibold text-primary">R$ 85.000</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span>Transações recentes</span>
            <span className="text-lg font-semibold text-primary">+ 48</span>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-border/40 pt-4 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Ferramentas de manutenção</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResyncExercises}
              loading={isSyncing}
            >
              Re-sincronizar biblioteca de exercícios
            </Button>
            <p>
              Esta ação chama a função <code className="font-mono text-[11px]">sync-exercises</code> e atualiza a
              tabela <code className="font-mono text-[11px]">biblioteca_exercicios</code> com GIFs válidos da
              ExerciseDB.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default AdminPage;
