import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Globe2, MapPin, PauseCircle, Shield, Bell, Target, Watch } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import {
  useUserPreferences,
  MeasurementSystem,
  ActivityPrivacy,
  DistanceUnit,
  WeightUnit,
  HeightUnit,
  GpsAccuracyMode,
} from "@/hooks/useUserPreferences";

const schema = z.object({
  languagePref: z.string().default("pt-BR"),
  measurementSystem: z.enum(["metric", "imperial"] satisfies [MeasurementSystem, MeasurementSystem]),
  distanceUnit: z.enum(["km", "mi"] satisfies [DistanceUnit, DistanceUnit]),
  weightUnit: z.enum(["kg", "lb"] satisfies [WeightUnit, WeightUnit]),
  heightUnit: z.enum(["cm", "ft-in"] satisfies [HeightUnit, HeightUnit]),
  gpsAutoPause: z.boolean(),
  gpsAccuracyMode: z.enum(["balanced", "high"] satisfies [GpsAccuracyMode, GpsAccuracyMode]),
  activityPrivacyDefault: z.enum([
    "public",
    "followers",
    "private",
  ] satisfies [ActivityPrivacy, ActivityPrivacy, ActivityPrivacy]),
  notifyActivityReminders: z.boolean(),
  notifyTrainingSummary: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const AlunoPreferenciasPage = () => {
  const navigate = useNavigate();
  const prefs = useUserPreferences();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      languagePref: prefs.languagePref,
      measurementSystem: prefs.measurementSystem,
      distanceUnit: prefs.distanceUnit,
      weightUnit: prefs.weightUnit,
      heightUnit: prefs.heightUnit,
      gpsAutoPause: prefs.gpsAutoPause,
      gpsAccuracyMode: prefs.gpsAccuracyMode,
      activityPrivacyDefault: prefs.activityPrivacyDefault,
      notifyActivityReminders: prefs.notifyActivityReminders,
      notifyTrainingSummary: prefs.notifyTrainingSummary,
    },
  });

  useEffect(() => {
    form.reset({
      languagePref: prefs.languagePref,
      measurementSystem: prefs.measurementSystem,
      distanceUnit: prefs.distanceUnit,
      weightUnit: prefs.weightUnit,
      heightUnit: prefs.heightUnit,
      gpsAutoPause: prefs.gpsAutoPause,
      gpsAccuracyMode: prefs.gpsAccuracyMode,
      activityPrivacyDefault: prefs.activityPrivacyDefault,
      notifyActivityReminders: prefs.notifyActivityReminders,
      notifyTrainingSummary: prefs.notifyTrainingSummary,
    });
  }, [
    prefs.languagePref,
    prefs.measurementSystem,
    prefs.distanceUnit,
    prefs.weightUnit,
    prefs.heightUnit,
    prefs.gpsAutoPause,
    prefs.gpsAccuracyMode,
    prefs.activityPrivacyDefault,
    prefs.notifyActivityReminders,
    prefs.notifyTrainingSummary,
    form,
  ]);

  const handleImmediateSave = async (key: keyof FormValues, value: FormValues[keyof FormValues]) => {
    form.setValue(key as any, value as any, { shouldDirty: true });

    await prefs.savePreferences({
      [key]: value,
    } as unknown as Partial<import("@/hooks/useUserPreferences").UserPreferences>);
  };

  const isLoading = prefs.loading;

  return (
    <main className="safe-bottom-content flex min-h-screen flex-col bg-background px-4 pt-6">
      <header className="mb-4 flex items-center gap-3">
        <BackIconButton to="/aluno/perfil" />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent-foreground/80">Área do Aluno</p>
          <h1 className="mt-1 page-title-gradient text-2xl font-semibold">Preferências</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Ajuste como o Nexfit se comporta para o seu jeito de treinar.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
          <div className="h-40 rounded-xl bg-muted animate-pulse" />
          <div className="h-32 rounded-xl bg-muted animate-pulse" />
          <div className="h-32 rounded-xl bg-muted animate-pulse" />
        </div>
      ) : (
        <Form {...form}>
          <form className="flex flex-1 flex-col gap-4">
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">Idioma & interface</h2>
              <Card className="border border-accent/40 bg-card/80">
                <CardContent className="space-y-4 pt-4 pb-4">
                  <FormField
                    control={form.control}
                    name="languagePref"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm font-medium">
                          <Globe2 className="h-4 w-4" />
                          Idioma do app
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              void handleImmediateSave("languagePref", value as FormValues["languagePref"]);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o idioma" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          O Nexfit opera 100% em português. Traduções automáticas baseadas no sistema estão
                          desativadas.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">Unidades & medidas</h2>
              <Card className="border border-accent/40 bg-card/80">
                <CardContent className="space-y-4 pt-4 pb-4">
                  <FormField
                    control={form.control}
                    name="measurementSystem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm font-medium">
                          <MapPin className="h-4 w-4" />
                          Sistema de medidas
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              void handleImmediateSave(
                                "measurementSystem",
                                value as FormValues["measurementSystem"],
                              );
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="metric">Métrico (km, kg, cm)</SelectItem>
                              <SelectItem value="imperial">Imperial (mi, lb, ft-in)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Define o padrão geral das unidades mostradas no app.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="distanceUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Unidade de distância</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              void handleImmediateSave("distanceUnit", value as FormValues["distanceUnit"]);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="km">Quilômetros (km)</SelectItem>
                              <SelectItem value="mi">Milhas (mi)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Usada em corridas, caminhadas e relatórios de distância.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weightUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Unidade de peso</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              void handleImmediateSave("weightUnit", value as FormValues["weightUnit"]);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kg">Quilos (kg)</SelectItem>
                              <SelectItem value="lb">Libras (lb)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="heightUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Unidade de altura</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              void handleImmediateSave("heightUnit", value as FormValues["heightUnit"]);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cm">Centímetros (cm)</SelectItem>
                              <SelectItem value="ft-in">Pés + polegadas (ft/in)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">GPS & comportamento</h2>
              <Card className="border border-accent/40 bg-card/80">
                <CardContent className="space-y-4 pt-4 pb-4">
                  <FormField
                    control={form.control}
                    name="gpsAutoPause"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0 rounded-lg border border-border/60 bg-muted px-3 py-2">
                        <div className="flex items-center gap-2">
                          <PauseCircle className="h-4 w-4" />
                          <div className="flex flex-col">
                            <FormLabel className="text-sm font-medium">Pausa automática do GPS</FormLabel>
                            <p className="text-[11px] text-muted-foreground">
                              Quando ligado, o app pausa o cálculo de distância/pace quando você está parado.
                            </p>
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(value) => {
                              field.onChange(value);
                              void handleImmediateSave("gpsAutoPause", value as FormValues["gpsAutoPause"]);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gpsAccuracyMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm font-medium">
                          <Target className="h-4 w-4" />
                          Modo de precisão do GPS
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              void handleImmediateSave(
                                "gpsAccuracyMode",
                                value as FormValues["gpsAccuracyMode"],
                              );
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="balanced">Equilibrado (bateria + precisão)</SelectItem>
                              <SelectItem value="high">Alta precisão (maior consumo de bateria)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">Notificações</h2>
              <Card className="border border-accent/40 bg-card/80">
                <CardContent className="space-y-4 pt-4 pb-4">
                  <FormField
                    control={form.control}
                    name="notifyActivityReminders"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0 rounded-lg border border-border/60 bg-muted px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          <div className="flex flex-col">
                            <FormLabel className="text-sm font-medium">Lembretes de atividade</FormLabel>
                            <p className="text-[11px] text-muted-foreground">
                              Alertas para não esquecer seus treinos planejados.
                            </p>
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(value) => {
                              field.onChange(value);
                              void handleImmediateSave(
                                "notifyActivityReminders",
                                value as FormValues["notifyActivityReminders"],
                              );
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notifyTrainingSummary"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0 rounded-lg border border-border/60 bg-muted px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Watch className="h-4 w-4" />
                          <div className="flex flex-col">
                            <FormLabel className="text-sm font-medium">
                              Resumo de treinos
                            </FormLabel>
                            <p className="text-[11px] text-muted-foreground">
                              Notificações com o resumo dos seus treinos.
                            </p>
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(value) => {
                              field.onChange(value);
                              void handleImmediateSave(
                                "notifyTrainingSummary",
                                value as FormValues["notifyTrainingSummary"],
                              );
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </section>

            <section className="space-y-3 pb-2">
              <h2 className="text-sm font-medium text-foreground">Privacidade</h2>
              <Card className="border border-accent/40 bg-card/80">
                <CardContent className="space-y-4 pt-4 pb-4">
                  <FormField
                    control={form.control}
                    name="activityPrivacyDefault"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm font-medium">
                          <Shield className="h-4 w-4" />
                          Visibilidade padrão das atividades
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              void handleImmediateSave(
                                "activityPrivacyDefault",
                                value as FormValues["activityPrivacyDefault"],
                              );
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="public">Pública</SelectItem>
                              <SelectItem value="followers">Apenas seguidores</SelectItem>
                              <SelectItem value="private">Somente você</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Essa configuração será utilizada como padrão em novas atividades e experiências sociais.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </section>

            {/* Hidden button only to satisfy form semantics, changes são salvas a cada alteração */}
            <button type="submit" className="hidden" aria-hidden="true">
              Salvar
            </button>
          </form>
        </Form>
      )}
    </main>
  );
};

export default AlunoPreferenciasPage;
