import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Skull, Pencil, Trash2, Eye, Dumbbell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ManualRoutine = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  days: any[];
  created_at: string;
  updated_at: string;
};

export default function ModoRaizPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ["manual_routines", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_routines" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ManualRoutine[];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("manual_routines" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual_routines"] });
      toast({ title: "Rotina excluída com sucesso." });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir rotina.", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <BackIconButton to="/aluno/dashboard" />
          <Skull className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Modo Raiz</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5">
        {/* Subtitle + CTA */}
        <p className="mb-4 text-sm text-muted-foreground">
          Controle total da sua rotina de treinos. Aqui, quem manda é você.
        </p>

        <Button
          className="mb-6 w-full gap-2 font-bold"
          size="lg"
          onClick={() => navigate("/aluno/modo-raiz/nova")}
        >
          <Plus className="h-5 w-5" />
          Criar rotina manual
        </Button>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : routines.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Dumbbell className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Você ainda não criou nenhuma rotina no Modo Raiz.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map((r) => (
              <Card key={r.id} className="border-border/60">
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-foreground">{r.name}</h3>
                      <Badge variant={r.is_active ? "default" : "secondary"} className="shrink-0 text-[10px]">
                        {r.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(r.days as any[])?.length ?? 0} dia(s) de treino
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Editado em {format(new Date(r.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => navigate(`/aluno/modo-raiz/${r.id}`)}
                      aria-label="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => navigate(`/aluno/modo-raiz/${r.id}/editar`)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteId(r.id)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir rotina?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. A rotina será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FloatingNavIsland />
    </div>
  );
}
