import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OnboardingLoadingScreen from "@/components/onboarding/OnboardingLoadingScreen";

const onboardingSchema = z.object({
  nome: z.string().min(2, "Informe pelo menos 2 caracteres"),
  genero: z.enum(["masculino", "feminino", "outro"], {
    errorMap: () => ({ message: "Selecione um gênero" }),
  }),
  altura_cm: z
    .string()
    .refine((val) => !Number.isNaN(parseFloat(val)) && parseFloat(val) > 0, "Informe uma altura válida"),
  peso_kg: z
    .string()
    .refine((val) => !Number.isNaN(parseFloat(val)) && parseFloat(val) > 0, "Informe um peso válido"),
  objetivo: z.string().min(3, "Selecione um objetivo"),
  nivel: z.enum(["iniciante", "intermediario", "avancado"], {
    errorMap: () => ({ message: "Selecione seu nível" }),
  }),
  training_days: z
    .array(
      z.enum([
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ]),
    )
    .min(2, "Selecione entre 2 e 6 dias da semana")
    .max(6, "Selecione entre 2 e 6 dias da semana"),
  focus_group: z.enum(["Balanced", "Chest", "Back", "Arms", "Legs", "Glutes", "Abs"], {
    errorMap: () => ({ message: "Selecione um grupo muscular" }),
  }),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const steps = ["Identificação", "Biometria", "Foco", "Nível", "Dias", "Grupo"] as const;

const TRAINING_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const TRAINING_DAYS_LABELS: Record<(typeof TRAINING_DAYS)[number], string> = {
  Monday: "Segunda-feira",
  Tuesday: "Terça-feira",
  Wednesday: "Quarta-feira",
  Thursday: "Quinta-feira",
  Friday: "Sexta-feira",
  Saturday: "Sábado",
  Sunday: "Domingo",
};

const FOCUS_GROUPS = [
  { value: "Balanced", label: "Equilibrado", tag: "Recomendado" },
  { value: "Chest", label: "Peito" },
  { value: "Back", label: "Costas" },
  { value: "Arms", label: "Braços" },
  { value: "Legs", label: "Pernas" },
  { value: "Glutes", label: "Glúteos" },
  { value: "Abs", label: "Abdômen" },
] as const;

const TRAINING_LEVEL_LABELS: Record<OnboardingFormValues["nivel"], string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

const AlunoOnboardingPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingSummary, setProcessingSummary] = useState<{
    trainingLevelLabel?: string;
    trainingDaysLabel?: string;
    focusGroupLabel?: string;
  } | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      nome: "",
      genero: undefined,
      altura_cm: "",
      peso_kg: "",
      objetivo: "",
      nivel: undefined,
      training_days: [],
      focus_group: undefined,
    },
  });

  const selectedGenero = watch("genero");
  const selectedObjetivo = watch("objetivo");
  const selectedNivel = watch("nivel");
  const selectedTrainingDays = watch("training_days");
  const selectedFocusGroup = watch("focus_group");

  // Restaura dados do onboarding do cache local, se existirem
  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    const storageKey = `biotreiner_onboarding_${user.id}`;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const cached = JSON.parse(raw) as Partial<OnboardingFormValues> & { currentStep?: number };
        if (cached) {
          if (typeof cached.currentStep === "number") {
            setCurrentStep(cached.currentStep);
          }
          Object.entries(cached).forEach(([key, value]) => {
            if (key === "currentStep") return;
            if (value !== undefined && value !== null) {
              setValue(key as keyof OnboardingFormValues, value as any);
            }
          });
        }
      }
    } catch (error) {
      console.warn("Falha ao restaurar dados do onboarding do cache", error);
    }
  }, [user, setValue]);

  // Persiste continuamente o estado do formulário de onboarding
  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    const storageKey = `biotreiner_onboarding_${user.id}`;
    try {
      const snapshot: Partial<OnboardingFormValues> & { currentStep: number } = {
        currentStep,
        nome: watch("nome"),
        genero: watch("genero"),
        altura_cm: watch("altura_cm"),
        peso_kg: watch("peso_kg"),
        objetivo: watch("objetivo"),
        nivel: watch("nivel"),
        training_days: watch("training_days"),
        focus_group: watch("focus_group"),
      };
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch (error) {
      console.warn("Falha ao salvar dados do onboarding no cache", error);
    }
  }, [user, currentStep, watch]);

  useEffect(() => {
    if (!user) {
      navigate("/auth", { replace: true });
    }
  }, [user, navigate]);

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
    return await new Promise<T>((resolve, reject) => {
      const t = window.setTimeout(() => reject(new Error(label)), timeoutMs);
      promise
        .then(resolve)
        .catch(reject)
        .finally(() => window.clearTimeout(t));
    });
  };

  const writeOnboardingCache = (payload: {
    onboarding_completed: boolean;
    altura_cm: number | null;
    peso_kg: number | null;
    training_level?: string | null;
  }) => {
    if (!user || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        `biotreiner_onboarding_cache_${user.id}`,
        JSON.stringify({ ...payload, cached_at: Date.now() }),
      );
    } catch {
      // ignore
    }
  };

  const onSubmit = async (values: OnboardingFormValues) => {
    if (!user) return;

    const altura = parseFloat(values.altura_cm);
    const peso = parseFloat(values.peso_kg);

    try {
      if (isSaving) return;
      setIsSaving(true);

      // Fluxo de primeiro acesso deve ser confiável: sem internet, não prossegue.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        toast({
          title: "Sem conexão",
          description: "Conecte-se à internet para concluir o onboarding e gerar seu plano.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const payload = {
        display_name: values.nome,
        nome: values.nome,
        genero: values.genero,
        altura_cm: altura,
        peso_kg: peso,
        objetivo: values.objetivo,
        nivel: values.nivel,
        training_level: values.nivel,
        training_days: values.training_days,
        focus_group: values.focus_group,
        onboarding_completed: true,
      };

      // Preferência do requisito: UPDATE. Se não existir profile ainda, fazemos fallback para UPSERT.
      const updatePromise = supabase.from("profiles").update(payload as any).eq("id", user.id).select("id");
      const updateRes: any = await withTimeout(updatePromise as any, 6000, "onboarding_update_timeout");
      if (updateRes?.error) throw updateRes.error;
      if (Array.isArray(updateRes?.data) && updateRes.data.length === 0) {
        const upsertPromise = supabase.from("profiles").upsert({ id: user.id, ...payload } as any, { onConflict: "id" });
        const upsertRes: any = await withTimeout(upsertPromise as any, 6000, "onboarding_upsert_timeout");
        if (upsertRes?.error) throw upsertRes.error;
      }

      // Atualiza cache que o gate (RequireOnboarding) usa.
      writeOnboardingCache({ onboarding_completed: true, altura_cm: altura, peso_kg: peso, training_level: values.nivel });

      // Limpa o cache do formulário após concluir.
      try {
        window.localStorage.removeItem(`biotreiner_onboarding_${user.id}`);
      } catch {
        // ignore
      }

      // Loading + redirecionamento (apenas depois de persistir com sucesso)
      setIsProcessing(true);
      setProcessingSummary({
        trainingLevelLabel: TRAINING_LEVEL_LABELS[values.nivel],
        trainingDaysLabel: (values.training_days ?? [])
          .map((day) => TRAINING_DAYS_LABELS[day] ?? day)
          .join(", "),
        focusGroupLabel: FOCUS_GROUPS.find((g) => g.value === values.focus_group)?.label ?? String(values.focus_group),
      });
    } catch (err: any) {
      toast({
        title: "Erro ao salvar onboarding",
        description: err?.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getFirstInvalidStep = () => {
    const v = {
      nome: (watch("nome") ?? "").trim(),
      genero: watch("genero"),
      altura_cm: watch("altura_cm"),
      peso_kg: watch("peso_kg"),
      objetivo: (watch("objetivo") ?? "").trim(),
      nivel: watch("nivel"),
      training_days: watch("training_days") ?? [],
      focus_group: watch("focus_group"),
    };

    if (!v.nome || v.nome.length < 2 || !v.genero) return 0;
    const altura = parseFloat(String(v.altura_cm ?? ""));
    const peso = parseFloat(String(v.peso_kg ?? ""));
    if (!Number.isFinite(altura) || altura <= 0 || !Number.isFinite(peso) || peso <= 0) return 1;
    if (!v.objetivo || v.objetivo.length < 3) return 2;
    if (!v.nivel) return 3;
    if (!Array.isArray(v.training_days) || v.training_days.length < 2 || v.training_days.length > 6) return 4;
    if (!v.focus_group) return 5;
    return null;
  };

  const toggleTrainingDay = (day: (typeof TRAINING_DAYS)[number]) => {
    const current = (watch("training_days") ?? []) as string[];
    const exists = current.includes(day);

    if (exists) {
      setValue(
        "training_days",
        current.filter((d) => d !== day) as any,
        { shouldValidate: true },
      );
      return;
    }

    if (current.length >= 6) {
      toast({
        title: "Seleção inválida",
        description: "Selecione entre 2 e 6 dias da semana",
        variant: "destructive",
      });
      return;
    }

    setValue("training_days", [...current, day] as any, { shouldValidate: true });
  };

  const focusStep = (step: number) => {
    setCurrentStep(step);
    window.setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleFinalSubmit = handleSubmit(
    (values) => {
      const firstInvalid = getFirstInvalidStep();
      if (firstInvalid !== null) {
        if (firstInvalid === 4) {
          toast({
            title: "Seleção inválida",
            description: "Selecione entre 2 e 6 dias da semana",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Faltam informações",
            description: "Complete as etapas pendentes para concluir seu plano.",
            variant: "destructive",
          });
        }
        focusStep(firstInvalid);
        return;
      }
      onSubmit(values);
    },
    () => {
      const firstInvalid = getFirstInvalidStep();
      toast({
        title: "Revise suas respostas",
        description: "Há campos obrigatórios pendentes. Vamos te levar até eles.",
        variant: "destructive",
      });
      focusStep(firstInvalid ?? 0);
    },
  );
  if (isProcessing) {
    return (
      <OnboardingLoadingScreen
        durationMs={9000}
        trainingLevelLabel={processingSummary?.trainingLevelLabel}
        trainingDaysLabel={processingSummary?.trainingDaysLabel}
        focusGroupLabel={processingSummary?.focusGroupLabel}
        onProceed={() => navigate("/aluno/dashboard", { replace: true })}
      />
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Como podemos te chamar?</Label>
              <Input id="nome" placeholder="Seu nome" {...register("nome")} />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Gênero</Label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setValue("genero", "masculino", { shouldValidate: true })}
                  className={`rounded-full border px-3 py-2 transition-colors ${
                    selectedGenero === "masculino"
                      ? "border-primary text-primary"
                      : "border-border bg-background/60 hover:border-primary"
                  }`}
                >
                  Masculino
                </button>
                <button
                  type="button"
                  onClick={() => setValue("genero", "feminino", { shouldValidate: true })}
                  className={`rounded-full border px-3 py-2 transition-colors ${
                    selectedGenero === "feminino"
                      ? "border-primary text-primary"
                      : "border-border bg-background/60 hover:border-primary"
                  }`}
                >
                  Feminino
                </button>
                <button
                  type="button"
                  onClick={() => setValue("genero", "outro", { shouldValidate: true })}
                  className={`rounded-full border px-3 py-2 transition-colors ${
                    selectedGenero === "outro"
                      ? "border-primary text-primary"
                      : "border-border bg-background/60 hover:border-primary"
                  }`}
                >
                  Outro
                </button>
              </div>
              <div className="hidden">
                <input id="genero_masculino" type="radio" value="masculino" {...register("genero")} />
                <input id="genero_feminino" type="radio" value="feminino" {...register("genero")} />
                <input id="genero_outro" type="radio" value="outro" {...register("genero")} />
              </div>
              {errors.genero && <p className="text-xs text-destructive">{errors.genero.message}</p>}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="altura_cm">Altura (cm)</Label>
              <Input id="altura_cm" type="number" inputMode="decimal" placeholder="Ex: 175" {...register("altura_cm")} />
              {errors.altura_cm && <p className="text-xs text-destructive">{errors.altura_cm.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="peso_kg">Peso atual (kg)</Label>
              <Input id="peso_kg" type="number" inputMode="decimal" placeholder="Ex: 72" {...register("peso_kg")} />
              {errors.peso_kg && <p className="text-xs text-destructive">{errors.peso_kg.message}</p>}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-3">
            <Label>Qual é o foco principal agora?</Label>
            <div className="grid gap-2 text-xs">
              {[
                "Emagrecimento",
                "Ganho de massa muscular",
                "Resistência e condicionamento",
                "Saúde geral e bem-estar",
              ].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setValue("objetivo", label, { shouldValidate: true })}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                    selectedObjetivo === label
                      ? "border-primary text-primary"
                      : "border-border bg-background/60 hover:border-primary"
                  }`}
                >
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <input id="objetivo" type="hidden" {...register("objetivo")} />
            {errors.objetivo && <p className="text-xs text-destructive">{errors.objetivo.message}</p>}
          </div>
        );
      case 3:
        return (
          <div className="space-y-3">
            <Label>Qual seu nível atual em treinos?</Label>
            <div className="grid gap-2 text-xs">
              <button
                type="button"
                onClick={() => setValue("nivel", "iniciante", { shouldValidate: true })}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  selectedNivel === "iniciante"
                    ? "border-primary text-primary"
                    : "border-border bg-background/60 hover:border-primary"
                }`}
              >
                Iniciante
                <p className="mt-1 text-[10px] text-muted-foreground">Treinando há menos de 6 meses ou de forma irregular.</p>
              </button>
              <button
                type="button"
                onClick={() => setValue("nivel", "intermediario", { shouldValidate: true })}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  selectedNivel === "intermediario"
                    ? "border-primary text-primary"
                    : "border-border bg-background/60 hover:border-primary"
                }`}
              >
                Intermediário
                <p className="mt-1 text-[10px] text-muted-foreground">Treina de forma consistente há 6-24 meses.</p>
              </button>
              <button
                type="button"
                onClick={() => setValue("nivel", "avancado", { shouldValidate: true })}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  selectedNivel === "avancado"
                    ? "border-primary text-primary"
                    : "border-border bg-background/60 hover:border-primary"
                }`}
              >
                Avançado
                <p className="mt-1 text-[10px] text-muted-foreground">Treino intenso e estruturado há mais de 2 anos.</p>
              </button>
            </div>
            <div className="hidden">
              <input id="nivel_iniciante" type="radio" value="iniciante" {...register("nivel")} />
              <input id="nivel_intermediario" type="radio" value="intermediario" {...register("nivel")} />
              <input id="nivel_avancado" type="radio" value="avancado" {...register("nivel")} />
            </div>
            {errors.nivel && <p className="text-xs text-destructive">{errors.nivel.message}</p>}
          </div>
        );
      case 4:
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Em quais dias da semana você gostaria de treinar?</Label>
              <p className="text-xs text-muted-foreground">Selecione de 2 a 6 dias</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {TRAINING_DAYS.map((day) => {
                const selected = Array.isArray(selectedTrainingDays) && selectedTrainingDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleTrainingDay(day)}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                      selected
                        ? "border-primary text-primary"
                        : "border-border bg-background/60 hover:border-primary"
                    }`}
                  >
                    {TRAINING_DAYS_LABELS[day] ?? day}
                  </button>
                );
              })}
            </div>

            <input id="training_days" type="hidden" {...register("training_days")} />
            {errors.training_days && (
              <p className="text-xs text-destructive">{errors.training_days.message as any}</p>
            )}
          </div>
        );
      case 5:
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Qual grupo muscular você gostaria de priorizar?</Label>
              <p className="text-xs text-muted-foreground">Escolha o principal grupo muscular que deseja focar</p>
            </div>

            <div className="grid gap-2 text-xs">
              {FOCUS_GROUPS.map((opt) => {
                const selected = selectedFocusGroup === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue("focus_group", opt.value as any, { shouldValidate: true })}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                      selected
                        ? "border-primary text-primary"
                        : "border-border bg-background/60 hover:border-primary"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {(opt as any).tag ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {(opt as any).tag}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <input id="focus_group" type="hidden" {...register("focus_group")} />
            {errors.focus_group && <p className="text-xs text-destructive">{errors.focus_group.message}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main ref={containerRef as any} className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border border-accent/40 bg-card/80 pb-4 pt-2 backdrop-blur">
        <CardContent className="space-y-6 pt-4">
          <header className="space-y-2 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent-foreground/80">Primeiro acesso</p>
            <h1 className="text-lg font-semibold text-foreground">Personalize seu plano Nexfit</h1>
            <p className="text-xs text-muted-foreground">
              Responda poucas perguntas e a IA monta sua rotina ideal de treinos e bem-estar.
            </p>
          </header>


          <div className="flex h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {renderStep()}

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentStep === 0}
                onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
              >
                Voltar
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  size="sm"
                  className="ml-auto"
                  onClick={() => {
                    if (currentStep === 4) {
                      const days = (watch("training_days") ?? []) as string[];
                      if (days.length < 2 || days.length > 6) {
                        toast({
                          title: "Seleção inválida",
                          description: "Selecione entre 2 e 6 dias da semana",
                          variant: "destructive",
                        });
                        return;
                      }
                    }
                    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
                  }}
                >
                  Próximo
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="ml-auto"
                  onClick={() => handleFinalSubmit()}
                  disabled={isSaving}
                  loading={isSaving}
                >
                  Concluir e gerar plano
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default AlunoOnboardingPage;
