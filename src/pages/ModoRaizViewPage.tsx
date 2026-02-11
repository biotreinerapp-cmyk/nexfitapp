import { useNavigate, useParams } from "react-router-dom";
import { Skull, Pencil } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        Carregando...
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-3">
        <p className="text-muted-foreground">Rotina não encontrada.</p>
        <Button variant="outline" onClick={() => navigate("/aluno/modo-raiz")}>
          Voltar
        </Button>
      </div>
    );
  }

  const days = (routine.days ?? []) as any[];

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <BackIconButton to="/aluno/modo-raiz" />
          <Skull className="h-5 w-5 text-primary" />
          <h1 className="flex-1 truncate text-lg font-bold text-foreground">{routine.name}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/aluno/modo-raiz/${id}/editar`)}
            aria-label="Editar"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 pt-5">
        <div className="flex items-center gap-2">
          <Badge variant={routine.is_active ? "default" : "secondary"}>
            {routine.is_active ? "Ativa" : "Inativa"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Editado em {format(new Date(routine.updated_at), "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </div>

        {routine.description && (
          <p className="text-sm text-muted-foreground">{routine.description}</p>
        )}

        {days.map((day: any, di: number) => (
          <Card key={day.id ?? di} className="border-border/60">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">{day.name || `Dia ${di + 1}`}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {(day.exercises ?? []).map((ex: any, ei: number) => (
                <div
                  key={ex.id ?? ei}
                  className="flex items-start gap-3 rounded-md bg-muted/30 p-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {ei + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{ex.name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">
                      {ex.sets}×{ex.reps}
                      {ex.load ? ` • ${ex.load}` : ""}
                      {ex.rest_seconds ? ` • ${ex.rest_seconds}s descanso` : ""}
                    </p>
                    {ex.notes && (
                      <p className="mt-1 text-xs italic text-muted-foreground">{ex.notes}</p>
                    )}
                  </div>
                </div>
              ))}
              {(!day.exercises || day.exercises.length === 0) && (
                <p className="text-xs text-muted-foreground">Nenhum exercício adicionado.</p>
              )}
            </CardContent>
          </Card>
        ))}

        {days.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum dia de treino cadastrado nesta rotina.
          </p>
        )}
      </main>

      <FloatingNavIsland />
    </div>
  );
}
