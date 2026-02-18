import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
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
    <main className="safe-bottom-main flex min-h-screen flex-col bg-background px-4 pb-32 pt-6 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] right-[-10%] h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] h-64 w-64 rounded-full bg-accent/5 blur-[100px]" />

      <header className="mb-6 flex items-center gap-3 relative z-10">
        <BackIconButton to="/aluno/perfil" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">Configurações</p>
          <h1 className="mt-1 page-title-gradient text-2xl font-black uppercase tracking-tighter leading-none">Preferências</h1>
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
            <section className="space-y-4 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 px-1">
                <div className="h-1 w-4 rounded-full bg-primary" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Idioma & Interface</h2>
              </div>
              <div className="relative overflow-hidden rounded-[28px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl">
                <FormField
                  control={form.control}
                  name="languagePref"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <Globe2 className="h-3.5 w-3.5 text-primary" />
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
                          <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-white/5 focus:ring-0 focus:ring-offset-0 transition-all font-medium">
                            <SelectValue placeholder="Selecione o idioma" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-white/10 bg-background/95 backdrop-blur-xl">
                            <SelectItem value="pt-BR" className="rounded-xl focus:bg-primary/20">Português (Brasil)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-tight opacity-60 italic">
                        O Nexfit opera nativamente em Português.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-4 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-2 px-1">
                <div className="h-1 w-4 rounded-full bg-accent" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/60">Unidades & Medidas</h2>
              </div>
              <div className="relative overflow-hidden rounded-[28px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl space-y-6">
                <FormField
                  control={form.control}
                  name="measurementSystem"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-accent" />
                        Sistema de Medida
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
                          <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-white/5 focus:ring-0 focus:ring-offset-0 transition-all font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-white/10 bg-background/95 backdrop-blur-xl">
                            <SelectItem value="metric" className="rounded-xl focus:bg-accent/20">Métrico (km, kg, cm)</SelectItem>
                            <SelectItem value="imperial" className="rounded-xl focus:bg-accent/20">Imperial (mi, lb, ft)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="distanceUnit"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Distância</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              void handleImmediateSave("distanceUnit", value as FormValues["distanceUnit"]);
                            }}
                          >
                            <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-white/5 focus:ring-0 focus:ring-offset-0 transition-all font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-white/10 bg-background/95 backdrop-blur-xl">
                              <SelectItem value="km" className="rounded-xl focus:bg-accent/20">km</SelectItem>
                              <SelectItem value="mi" className="rounded-xl focus:bg-accent/20">mi</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weightUnit"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Peso</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              void handleImmediateSave("weightUnit", value as FormValues["weightUnit"]);
                            }}
                          >
                            <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-white/5 focus:ring-0 focus:ring-offset-0 transition-all font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-white/10 bg-background/95 backdrop-blur-xl">
                              <SelectItem value="kg" className="rounded-xl focus:bg-accent/20">kg</SelectItem>
                              <SelectItem value="lb" className="rounded-xl focus:bg-accent/20">lb</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="flex items-center gap-2 px-1">
                <div className="h-1 w-4 rounded-full bg-blue-500" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/60">GPS & Segurança</h2>
              </div>
              <div className="relative overflow-hidden rounded-[28px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl space-y-4">
                <FormField
                  control={form.control}
                  name="gpsAutoPause"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                      <div className="flex items-center gap-3">
                        <PauseCircle className="h-4 w-4 text-blue-400" />
                        <div className="flex flex-col">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-foreground">Auto-Pausa</FormLabel>
                          <p className="text-[8px] font-medium text-muted-foreground uppercase">GPS inteligente</p>
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
                  name="activityPrivacyDefault"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <Shield className="h-3.5 w-3.5 text-blue-400" />
                        Privacidade Padrão
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
                          <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-white/5 focus:ring-0 focus:ring-offset-0 transition-all font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-white/10 bg-background/95 backdrop-blur-xl">
                            <SelectItem value="public" className="rounded-xl focus:bg-blue-500/20">Pública</SelectItem>
                            <SelectItem value="followers" className="rounded-xl focus:bg-blue-500/20">Seguidores</SelectItem>
                            <SelectItem value="private" className="rounded-xl focus:bg-blue-500/20">Privada</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* Hidden button only to satisfy form semantics, changes são salvas a cada alteração */}
            <button type="submit" className="hidden" aria-hidden="true">
              Salvar
            </button>
          </form>
        </Form>
      )}
      <FloatingNavIsland />
    </main>
  );
};

export default AlunoPreferenciasPage;
