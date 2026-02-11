import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Skull, Plus, Trash2, GripVertical } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  load: string;
  rest_seconds: number;
  notes: string;
};

type RoutineDay = {
  id: string;
  name: string;
  exercises: Exercise[];
};

const newId = () => crypto.randomUUID();

const emptyExercise = (): Exercise => ({
  id: newId(),
  name: "",
  sets: 3,
  reps: 12,
  load: "",
  rest_seconds: 60,
  notes: "",
});

const emptyDay = (index: number): RoutineDay => ({
  id: newId(),
  name: `Dia ${String.fromCharCode(65 + index)}`,
  exercises: [emptyExercise()],
});

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
      setDays(
        (existing.days as RoutineDay[])?.length > 0
          ? (existing.days as RoutineDay[])
          : [emptyDay(0)]
      );
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Nome obrigatório");
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
  const addDay = () => setDays((d) => [...d, emptyDay(d.length)]);
  const removeDay = (dayId: string) => setDays((d) => d.filter((x) => x.id !== dayId));
  const updateDay = (dayId: string, field: string, value: string) =>
    setDays((d) => d.map((x) => (x.id === dayId ? { ...x, [field]: value } : x)));

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
          ? {
              ...day,
              exercises: day.exercises.map((e) => (e.id === exId ? { ...e, [field]: value } : e)),
            }
          : day
      )
    );

  if (isEdit && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <BackIconButton to="/aluno/modo-raiz" />
          <Skull className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">
            {isEdit ? "Editar Rotina" : "Nova Rotina"}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-5 px-4 pt-5">
        {/* Routine metadata */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="routine-name">Nome da rotina *</Label>
            <Input
              id="routine-name"
              placeholder="Ex: Push Pull Legs"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="routine-desc">Descrição / Observações</Label>
            <Textarea
              id="routine-desc"
              placeholder="Opcional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="routine-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="routine-active">Rotina ativa</Label>
          </div>
        </div>

        {/* Days */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Dias de treino</h2>
            <Button variant="outline" size="sm" className="gap-1" onClick={addDay}>
              <Plus className="h-4 w-4" /> Dia
            </Button>
          </div>

          <Accordion type="multiple" defaultValue={days.map((d) => d.id)} className="space-y-3">
            {days.map((day, di) => (
              <AccordionItem key={day.id} value={day.id} className="rounded-lg border border-border/60 bg-card">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-foreground">{day.name || `Dia ${di + 1}`}</span>
                    <span className="text-xs text-muted-foreground">
                      ({day.exercises.length} exercício{day.exercises.length !== 1 ? "s" : ""})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="mb-3 flex items-end gap-2">
                    <div className="flex-1">
                      <Label>Nome do dia</Label>
                      <Input
                        value={day.name}
                        onChange={(e) => updateDay(day.id, "name", e.target.value)}
                        placeholder="Ex: Peito e Tríceps"
                      />
                    </div>
                    {days.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => removeDay(day.id)}
                        aria-label="Remover dia"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Exercises */}
                  <div className="space-y-3">
                    {day.exercises.map((ex, ei) => (
                      <Card key={ex.id} className="border-border/40 bg-muted/30">
                        <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                          <CardTitle className="text-xs font-medium text-muted-foreground">
                            Exercício {ei + 1}
                          </CardTitle>
                          {day.exercises.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeExercise(day.id, ex.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-2 p-3 pt-0">
                          <Input
                            placeholder="Nome do exercício"
                            value={ex.name}
                            onChange={(e) => updateExercise(day.id, ex.id, "name", e.target.value)}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[11px]">Séries</Label>
                              <Input
                                type="number"
                                min={1}
                                value={ex.sets}
                                onChange={(e) =>
                                  updateExercise(day.id, ex.id, "sets", Number(e.target.value))
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-[11px]">Repetições</Label>
                              <Input
                                type="number"
                                min={1}
                                value={ex.reps}
                                onChange={(e) =>
                                  updateExercise(day.id, ex.id, "reps", Number(e.target.value))
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-[11px]">Carga</Label>
                              <Input
                                placeholder="Ex: 40kg"
                                value={ex.load}
                                onChange={(e) =>
                                  updateExercise(day.id, ex.id, "load", e.target.value)
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-[11px]">Descanso (seg)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={ex.rest_seconds}
                                onChange={(e) =>
                                  updateExercise(day.id, ex.id, "rest_seconds", Number(e.target.value))
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-[11px]">Observações</Label>
                            <Input
                              placeholder="Opcional"
                              value={ex.notes}
                              onChange={(e) =>
                                updateExercise(day.id, ex.id, "notes", e.target.value)
                              }
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full gap-1"
                    onClick={() => addExercise(day.id)}
                  >
                    <Plus className="h-4 w-4" /> Exercício
                  </Button>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Save */}
        <Button
          className="w-full font-bold"
          size="lg"
          loading={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {isEdit ? "Salvar alterações" : "Criar rotina"}
        </Button>
      </main>

      <FloatingNavIsland />
    </div>
  );
}
