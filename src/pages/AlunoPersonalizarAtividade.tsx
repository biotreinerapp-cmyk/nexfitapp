import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import logoNexfit from "@/assets/nexfit-logo.png";
import type { ActivityType, ActivityCategory } from "@/lib/activityTypes";
import { getActivityTypeById } from "@/lib/activityTypes";
import { useFeedback } from "@/hooks/useFeedback";
import { isPermissionOrRlsError, logPermissionError } from "@/lib/supabaseClient";
import { enqueueWorkout } from "@/lib/offlineQueue";
import { BackIconButton } from "@/components/navigation/BackIconButton";

interface PersonalizarState {
  sessaoId?: string;
  atividadeNome?: string;
  elapsedSeconds?: number;
  bpmMedio?: number;
  caloriasEstimadas?: number;
  activityType?: ActivityType;
  intensidade?: string;
  // Dados de GPS (opcionais, apenas para atividades com GPS)
  distanceKm?: number;
  paceAvg?: number;
  gpsRoute?: Array<{ lat: number; lng: number; timestamp?: number }>;
  caption?: string;
  generatedUrl?: string;
}

interface ActivityShareCardProps {
  backgroundUrl?: string;
  activityTitle: string;
  distanciaKm: number;
  durationText: string;
  paceText: string;
  calorias: number;
  activityDate: string;
  clubName?: string | null;
  activityCategory?: ActivityCategory;
  intensidade?: string;
  userName?: string | null;
  userAvatarUrl?: string | null;
}

const ActivityShareCard = ({
  backgroundUrl,
  activityTitle,
  distanciaKm,
  durationText,
  paceText,
  calorias,
  activityDate,
  clubName,
  activityCategory,
  intensidade,
  userName,
  userAvatarUrl,
}: ActivityShareCardProps) => {
  const isGpsActivity = activityCategory === "deslocamento";
  const kmValue = Math.max(0, distanciaKm ?? 0);

  const userInitials = (userName ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="relative h-[1350px] w-[1080px] overflow-hidden bg-background">
      {backgroundUrl && (
        <img
          src={backgroundUrl}
          alt="Fundo do treino"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
      )}

      {/* Scrim de contraste: reforça a leitura no canto inferior esquerdo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(900px 900px at 0% 100%, hsl(var(--background) / 0.92) 0%, transparent 62%), linear-gradient(to bottom, transparent 0%, transparent 52%, hsl(var(--background) / 0.78) 100%)",
        }}
      />

      <div className="relative flex h-full w-full flex-col p-16 font-sans text-foreground">
        {/* Header */}
        <header className="flex items-start justify-between gap-10">
          {/* Top-left: data/hora + tipo */}
          <div className="min-w-0 flex-1 pr-6">
            <p className="text-base font-semibold text-foreground/80">{activityDate}</p>
            <h1 className="mt-2 text-2xl font-bold leading-snug tracking-tight text-foreground break-words">
              {activityTitle}
            </h1>
            {(clubName || intensidade) && (
              <p className="mt-2 text-sm font-medium text-foreground/70 break-words">
                {[clubName, intensidade].filter(Boolean).join(" • ")}
              </p>
            )}
          </div>

          {/* Top-right: mini card perfil */}
          {(userName || userAvatarUrl) && (
            <div className="shrink-0 max-w-[420px] rounded-2xl border border-border/60 bg-background/45 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt={userName ? `Foto de perfil de ${userName}` : "Foto de perfil"}
                    className="h-10 w-10 rounded-full object-cover"
                    loading="eager"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/60 text-xs font-semibold">
                    {userInitials || "?"}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-base font-semibold leading-snug text-foreground break-words">
                    {userName ?? "Usuário"}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-foreground/70">Nexfit</p>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Footer: métricas + logo */}
        <main className="mt-auto">
          <div className="flex items-end justify-between gap-10">
            {/* Bottom-left: métricas (inspirado no modelo) */}
            <section className="flex max-w-[620px] flex-col items-start text-left">
              {isGpsActivity && (
                <div className="mb-12">
                  <p className="text-sm font-semibold tracking-widest text-foreground/60">KMS</p>
                  <p className="mt-1 text-[104px] font-bold leading-none tracking-tighter">
                    {kmValue.toFixed(2).replace(".", ",")}
                  </p>
                </div>
              )}

              {/* Distanciamento visual entre o bloco principal (KMs) e as demais métricas */}
              <div className="grid grid-cols-2 gap-x-14 gap-y-10">
                {isGpsActivity && (
                  <div>
                    <p className="text-sm font-semibold tracking-widest text-foreground/60">RITMO MÉDIO</p>
                    <p className="mt-2 text-5xl font-bold tracking-tight text-foreground">{paceText}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold tracking-widest text-foreground/60">TEMPO</p>
                  <p className="mt-2 text-5xl font-bold tracking-tight text-foreground">{durationText}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold tracking-widest text-foreground/60">CALORIAS</p>
                  <p className="mt-2 text-5xl font-bold tracking-tight text-foreground">{Math.round(calorias)} kcal</p>
                </div>
              </div>
            </section>

            {/* Logo (inferior direito) */}
            <div className="flex items-end justify-end">
              <img
                src={logoNexfit}
                alt="Logo Nexfit"
                className="h-14 w-auto [filter:brightness(0)_invert(1)]"
                loading="eager"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const AlunoPersonalizarAtividadePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { withFeedback, showError } = useFeedback();

  const state = (location.state as PersonalizarState) || {};
  const {
    sessaoId,
    atividadeNome,
    elapsedSeconds,
    bpmMedio,
    caloriasEstimadas,
    activityType: activityTypeFromState,
    intensidade,
    distanceKm: gpsDistanceKm,
    paceAvg: gpsPaceAvg,
    gpsRoute,
  } = state;

  // Fallback importante: quando o usuário volta do Histórico ou recarrega a página,
  // podemos perder o objeto `activityType` no state. Nesse caso, inferimos pelo nome/id.
  const activityType = useMemo(() => {
    if (activityTypeFromState) return activityTypeFromState;
    const key = (atividadeNome ?? "").toLowerCase().trim();
    return getActivityTypeById(key) ?? undefined;
  }, [activityTypeFromState, atividadeNome]);

  const requiresDistance = activityType?.usesDistance ?? true;
  const usesGps = activityType?.usesGps ?? false;
  const activityCategory = activityType?.category;
  const [file, setFile] = useState<File | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [generationStep, setGenerationStep] = useState<"idle" | "processing" | "done">("idle");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(state.generatedUrl ?? null);
  const [caption, setCaption] = useState(state.caption ?? "");
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [showSuccessView, setShowSuccessView] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const finalizeOnceRef = useRef(false);
  const shareOnceRef = useRef(false);

  useEffect(() => {
    if (!sessaoId || !atividadeNome || !elapsedSeconds) {
      toast({
        title: "Sessão não encontrada",
        description: "Finalize uma atividade para personalizar o momento.",
        variant: "destructive",
      });
      navigate("/aluno/dashboard", { replace: true });
      return;
    }

    // Restaura personalização salva localmente (legenda / imagem gerada)
    if (user && !state.caption && !state.generatedUrl && typeof window !== "undefined") {
      const storageKey = `biotreiner_personalizar_${user.id}_${sessaoId}`;
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const cached = JSON.parse(raw) as { caption?: string; generatedUrl?: string | null };
          if (cached.caption) setCaption(cached.caption);
          if (cached.generatedUrl) setGeneratedUrl(cached.generatedUrl);
        }
      } catch (error) {
        console.warn("Falha ao restaurar personalização da atividade do cache", error);
      }
    }
  }, [sessaoId, atividadeNome, elapsedSeconds, navigate, toast, user, state.caption, state.generatedUrl]);

  useEffect(() => {
    // Persiste legenda e URL da imagem gerada para esta sessão
    if (!user || !sessaoId || typeof window === "undefined") return;

    const storageKey = `biotreiner_personalizar_${user.id}_${sessaoId}`;
    try {
      const payload = {
        caption: caption || "",
        generatedUrl: generatedUrl || null,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
      console.warn("Falha ao salvar personalização da atividade no cache", error);
    }
  }, [user, sessaoId, caption, generatedUrl]);

  const PROFILE_CACHE_KEY = useMemo(() => {
    if (!user) return null;
    return `biotreiner_profile_cache_${user.id}`;
  }, [user]);

  const readProfileCache = () => {
    if (!PROFILE_CACHE_KEY || typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as { nome?: string | null; avatar_data_url?: string | null; avatar_url?: string | null };
    } catch {
      return null;
    }
  };

  const writeProfileCache = (payload: { nome?: string | null; avatar_data_url?: string | null; avatar_url?: string | null }) => {
    if (!PROFILE_CACHE_KEY || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  };

  const toDataUrl = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) return null;
      const blob = await res.blob();
      // Evita estourar localStorage com arquivos grandes
      if (blob.size > 350_000) return null;
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const loadClubsAndProfile = async () => {
      if (!user) return;

      // OFFLINE-FIRST: usa cache (se houver) e não tenta bater no Supabase.
      if (!navigator.onLine) {
        const cached = readProfileCache();
        if (cached) {
          setProfileName(cached.nome ?? null);
          setProfileAvatarUrl(cached.avatar_data_url ?? cached.avatar_url ?? null);
        }
        setClubs([]);
        return;
      }

      const [{ data: memberships }, { data: profile }] = await Promise.all([
        supabase.from("running_club_members").select("club_id").eq("user_id", user.id).eq("status", "active"),
        supabase.from("profiles").select("nome, avatar_url").eq("id", user.id).maybeSingle(),
      ]);

      if (profile) {
        setProfileName(profile.nome ?? null);
        setProfileAvatarUrl(profile.avatar_url ?? null);

        // Cacheia um avatar pequeno como dataURL para gerar a imagem offline sem CORS.
        const avatarDataUrl = profile.avatar_url ? await toDataUrl(profile.avatar_url) : null;
        writeProfileCache({ nome: profile.nome ?? null, avatar_url: profile.avatar_url ?? null, avatar_data_url: avatarDataUrl });

        if (avatarDataUrl) {
          setProfileAvatarUrl(avatarDataUrl);
        }
      }

      if (!memberships || memberships.length === 0) {
        setClubs([]);
        return;
      }

      const clubIds = memberships.map((m) => m.club_id);
      const { data: clubsData } = await supabase.from("running_clubs").select("id, name").in("id", clubIds);

      const clubsList = (clubsData ?? []).map((c) => ({ id: c.id, name: c.name }));
      setClubs(clubsList);

      if (clubsList.length === 1) {
        setSelectedClubId(clubsList[0].id);
      }
    };

    void loadClubsAndProfile();
  }, [user, PROFILE_CACHE_KEY]);

  const durationText = useMemo(() => {
    if (!elapsedSeconds) return "00:00";
    const minutes = Math.floor(elapsedSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [elapsedSeconds]);

  const distanceNumber = useMemo(() => {
    if (!requiresDistance) return 0;

    // Atividades de deslocamento (corrida/caminhada/ciclismo etc.):
    // sempre priorizar o valor salvo/calculado (vindo do histórico/estado),
    // mesmo que `activityType` não esteja completo.
    if (activityCategory === "deslocamento" && gpsDistanceKm != null && gpsDistanceKm > 0) {
      return gpsDistanceKm;
    }

    return 0;
  }, [requiresDistance, gpsDistanceKm, activityCategory]);

  const paceText = useMemo(() => {
    if (!elapsedSeconds || !requiresDistance) return "--";

    if (activityCategory !== "deslocamento") return "--";

    const normalizePaceMinutesPerKm = (value: unknown): number | null => {
      const n = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(n) || n <= 0) return null;
      const minutesPerKm = n > 80 ? n / 60 : n;
      if (minutesPerKm < 1 || minutesPerKm > 120) return null;
      return minutesPerKm;
    };

    const derivedPace = distanceNumber > 0 ? (elapsedSeconds / 60) / distanceNumber : null;
    const paceMinPerKm = normalizePaceMinutesPerKm(gpsPaceAvg) ?? normalizePaceMinutesPerKm(derivedPace);

    if (!paceMinPerKm) return "--";

    const totalSecondsPerKm = paceMinPerKm * 60;
    const minutes = Math.floor(totalSecondsPerKm / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.round(totalSecondsPerKm % 60)
      .toString()
      .padStart(2, "0");

    return `${minutes}:${seconds} /km`;
  }, [elapsedSeconds, requiresDistance, gpsPaceAvg, activityCategory, distanceNumber]);

  const activityDateText = useMemo(() => {
    return new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const selectedClubName = useMemo(() => {
    if (selectedClubId) {
      return clubs.find((c) => c.id === selectedClubId)?.name ?? null;
    }
    if (clubs.length === 1) return clubs[0].name;
    return null;
  }, [clubs, selectedClubId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (selectedImageUrl) {
        URL.revokeObjectURL(selectedImageUrl);
      }
      const objectUrl = URL.createObjectURL(f);
      setSelectedImageUrl(objectUrl);
    }
  };

  const gerarImagem = async (): Promise<string | null> => {
    console.log("[PersonalizarAtividade] Botão 'Gerar imagem para compartilhar' clicado");

    if (!user || !sessaoId || !elapsedSeconds) {
      console.warn("[PersonalizarAtividade] Sessão ou usuário ausente ao gerar imagem", {
        hasUser: !!user,
        sessaoId,
        elapsedSeconds,
      });
      showError(undefined, {
        title: "Sessão não encontrada",
        description: "Finalize uma atividade para gerar a imagem.",
      });
      return null;
    }

    if (!file || !selectedImageUrl) {
      toast({
        title: "Adicione uma foto do momento",
        description: "Escolha uma foto do treino para gerar a arte de compartilhamento.",
      });
      console.warn("[PersonalizarAtividade] Nenhuma foto selecionada para gerar imagem");
      return null;
    }

    console.log("[PersonalizarAtividade] Iniciando geração de imagem", {
      sessaoId,
      atividadeNome,
      elapsedSeconds,
    });

    setModalOpen(true);
    setGenerationStep("processing");
    setIsProcessing(true);
    setGenerationProgress(10);

    let progressInterval: number | undefined;

    const waitForFontsAndImages = async (node: HTMLElement) => {
      // Fonts
      try {
        await (document.fonts?.ready ?? Promise.resolve());
      } catch {
        // ignore
      }

      // Imagens (evita captura antes do decode e evita requests pendentes)
      const imgs = Array.from(node.querySelectorAll("img"));
      await Promise.all(
        imgs.map(async (img) => {
          try {
            if (img.complete && img.naturalWidth > 0) return;
            // decode() falha em alguns browsers; fallback para onload
            if (typeof img.decode === "function") {
              await img.decode();
              return;
            }
            await new Promise<void>((resolve) => {
              const onDone = () => {
                img.removeEventListener("load", onDone);
                img.removeEventListener("error", onDone);
                resolve();
              };
              img.addEventListener("load", onDone);
              img.addEventListener("error", onDone);
            });
          } catch {
            // ignore
          }
        }),
      );
    };

    try {
      const node = previewRef.current;
      if (!node) throw new Error("Prévia da atividade não encontrada");

      await waitForFontsAndImages(node);

      progressInterval = window.setInterval(() => {
        setGenerationProgress((prev) => (prev < 90 ? prev + 5 : prev));
      }, 200);

      const scale = !navigator.onLine ? 1.5 : 2;

      const canvas = await html2canvas(node, {
        width: 1080,
        height: 1350,
        scale,
        // Offline: evita tentativas de CORS/rede (principalmente avatar remoto)
        useCORS: navigator.onLine,
        allowTaint: !navigator.onLine,
        backgroundColor: "#000000",
      });

      const dataUrl = canvas.toDataURL("image/png", 0.95);
      setGeneratedUrl(dataUrl);
      setGenerationProgress(100);
      setGenerationStep("done");

      console.log("[PersonalizarAtividade] Imagem gerada com sucesso");

      toast({
        title: "Image ready for sharing",
        description: "Image generated successfully.",
      });

      return dataUrl;
    } catch (error: any) {
      console.error("[PersonalizarAtividade] Erro ao gerar imagem da atividade", error);
      showError(error?.message, {
        title: "Erro ao personalizar",
      });
      setGenerationStep("idle");
      return null;
    } finally {
      if (progressInterval) {
        window.clearInterval(progressInterval);
      }
      setIsProcessing(false);
    }
  };

  // Responsável por salvar a sessão no histórico (atividade_sessao)
  // e registrar a última imagem gerada para uso em compartilhamentos futuros.
  const finalizeActivityAndSaveHistory = async (): Promise<boolean> => {
    if (!user || !sessaoId) {
      showError(undefined, {
        title: "Sessão não encontrada",
        description: "Finalize uma atividade antes de concluir o treino.",
      });
      return false;
    }

    // Bloqueia clique duplo imediatamente (antes de setState)
    if (finalizeOnceRef.current) return false;
    finalizeOnceRef.current = true;

    try {
      setIsProcessing(true);

      const activityTypeName = activityType?.name || atividadeNome || "Atividade";

      // Normaliza e valida pace para evitar valores absurdos no compartilhamento.
      // `paceAvg` esperado: minutos por km (min/km). Se vier em segundos por km,
      // normalizamos automaticamente.
      const normalizePaceMinutesPerKm = (value: unknown): number | null => {
        const n = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(n) || n <= 0) return null;

        // Heurística: se vier algo como 300–800, provavelmente está em segundos/km.
        const minutesPerKm = n > 80 ? n / 60 : n;

        // Faixa plausível (evita 300+ min/km por erros de GPS/distância quase zero)
        if (minutesPerKm < 1 || minutesPerKm > 120) return null;
        return minutesPerKm;
      };

      const distanceForHistory =
        requiresDistance && activityCategory === "deslocamento" && typeof gpsDistanceKm === "number" && gpsDistanceKm > 0
          ? gpsDistanceKm
          : null;

      const derivedPace =
        distanceForHistory && distanceForHistory > 0 ? (Math.max(0, elapsedSeconds) / 60) / distanceForHistory : null;

      const normalizedGpsPace = normalizePaceMinutesPerKm(gpsPaceAvg);
      const paceForHistory = normalizedGpsPace ?? normalizePaceMinutesPerKm(derivedPace);


      const endedAt = new Date().toISOString();
      const startedAt = new Date(Date.now() - Math.max(0, elapsedSeconds) * 1000).toISOString();

      // OFFLINE-FIRST: se estiver sem internet, enfileira tudo no IndexedDB
      if (!navigator.onLine) {
        await enqueueWorkout({
          id: sessaoId,
          userId: user.id,
          activityType: activityTypeName,
          startedAt,
          endedAt,
          durationSeconds: Math.max(0, elapsedSeconds),
          distanceKm: distanceForHistory ?? undefined,
          calories: Math.round(caloriasEstimadas ?? 0),
          avgHr: bpmMedio ?? undefined,
          paceAvg: paceForHistory ?? undefined,
          gpsPoints: usesGps && gpsRoute && gpsRoute.length > 0 ? gpsRoute : undefined,
          intensity: { label: intensidade ?? null },
          extras: {
            generatedUrl: generatedUrl ?? null,
            caption: caption ?? null,
          },
        });

        // Limpa eventual cache de monitoramento da atividade
        if (typeof window !== "undefined") {
          try {
            const ACTIVITY_STORAGE_PREFIX = "biotreiner_activity_" as const;
            const key = `${ACTIVITY_STORAGE_PREFIX}${user.id}_${sessaoId}`;
            window.localStorage.removeItem(key);
          } catch (e) {
            console.warn("[PersonalizarAtividade] Falha ao limpar cache da atividade do monitoramento", e);
          }
        }

        toast({
          title: "Treino concluído",
          description: "Salvo offline. Vamos sincronizar assim que você voltar à internet.",
        });

        setShowSuccessView(true);
        return true;
      }

      // ONLINE: grava no novo histórico unificado (workout_history)
      const { error: historyError } = await (supabase as any).from("workout_history").insert({
        user_id: user.id,
        activity_type: activityTypeName,
        source: "app",
        privacy: "public",
        started_at: startedAt,
        ended_at: endedAt,
        duration_seconds: Math.max(0, elapsedSeconds),
        distance_km: distanceForHistory,
        calories: Math.round(caloriasEstimadas ?? 0),
        avg_hr: bpmMedio ?? null,
        pace_avg: paceForHistory,
        gps_points: usesGps && gpsRoute && gpsRoute.length > 0 ? gpsRoute : null,
        intensity: { label: intensidade ?? null },
        extras: {
          legacy_sessao_id: sessaoId,
          generatedUrl: generatedUrl ?? null,
          caption: caption ?? null,
        },
      });

      if (historyError) {
        console.error("[PersonalizarAtividade] Erro ao salvar atividade na tabela workout_history", historyError);
      }

      // Mantém o fluxo legado (atividade_sessao) por compatibilidade com telas existentes
      const { error } = await supabase.from("atividade_sessao").upsert({
        id: sessaoId,
        user_id: user.id,
        tipo_atividade: activityTypeName,
        status: "finalizada",
        confirmado: true, // Confirmação explícita de atividade concluída
        bpm_medio: bpmMedio ?? null,
        calorias_estimadas: Math.round(caloriasEstimadas ?? 0),
        distance_km: distanceForHistory,
        pace_avg: paceForHistory,
        route: usesGps && gpsRoute && gpsRoute.length > 0 ? gpsRoute : null,
        finalizado_em: endedAt,
      });

      if (error) {
        console.error("[PersonalizarAtividade] Erro ao salvar atividade na tabela atividade_sessao", error);
        showError(error.message, {
          title: "Erro ao salvar atividade",
          description: "Não foi possível registrar seu treino. Tente novamente.",
        });
        return false;
      }

      // Persistimos a última imagem gerada para que o dashboard possa publicá-la no feed do clube
      if (typeof window !== "undefined" && generatedUrl) {
        try {
          window.localStorage.setItem(
            "biotreiner_last_share_image",
            JSON.stringify({ imageUrl: generatedUrl, sessaoId }),
          );
        } catch (e) {
          console.warn("[PersonalizarAtividade] Falha ao salvar imagem gerada no localStorage", e);
        }
      }

      // Limpa eventual cache de monitoramento da atividade
      if (typeof window !== "undefined") {
        try {
          const ACTIVITY_STORAGE_PREFIX = "biotreiner_activity_" as const;
          const key = `${ACTIVITY_STORAGE_PREFIX}${user.id}_${sessaoId}`;
          window.localStorage.removeItem(key);
        } catch (e) {
          console.warn("[PersonalizarAtividade] Falha ao limpar cache da atividade do monitoramento", e);
        }
      }

      toast({
        title: "Treino concluído",
        description: "Sua atividade foi salva no histórico.",
      });

      setShowSuccessView(true);
      return true;
    } finally {
      setIsProcessing(false);
      finalizeOnceRef.current = false;
    }
  };
  const handleCompartilharClube = async () => {
    console.log("[PersonalizarAtividade] Ação 'Publicar no clube de corrida' clicada", {
      selectedClubId,
      sessaoId,
    });

    if (!user || !sessaoId) {
      showError(undefined, {
        title: "Sessão não encontrada",
        description: "Finalize uma atividade antes de compartilhar no clube.",
      });
      console.warn("[PersonalizarAtividade] Usuário ou sessão ausentes ao compartilhar no clube", {
        hasUser: !!user,
        sessaoId,
      });
      return;
    }

    if (!selectedClubId) {
      showError(undefined, {
        title: "Selecione um clube",
        description: "Escolha em qual clube de corrida você quer compartilhar.",
      });
      console.warn("[PersonalizarAtividade] Nenhum clube selecionado ao compartilhar");
      return;
    }

    // Bloqueia clique duplo imediatamente
    if (shareOnceRef.current) return;
    shareOnceRef.current = true;

    try {
      setIsProcessing(true);

      // REGRA CRÍTICA: cada atividade gera no máximo 1 post no clube
      // Antes de criar o post, verificamos se já existe um registro em club_posts com o mesmo activity_id.
      const { data: existingPost, error: existingPostError } = await supabase
        .from("club_posts")
        .select("id, club_id")
        .eq("activity_id", sessaoId)
        .maybeSingle();

      if (existingPostError) {
        if (isPermissionOrRlsError(existingPostError)) {
          logPermissionError("club_posts", "select", existingPostError);
          showError("Você não tem permissão para visualizar posts deste clube.", {
            title: "Permissão negada",
            description: "Entre em contato com o administrador do clube para ajustar suas permissões.",
          });
          return;
        }

        console.error("[PersonalizarAtividade] Erro ao verificar existência prévia de post no clube", existingPostError);
      }

      if (existingPost) {
        console.log("[PersonalizarAtividade] Post já existe para esta atividade; fluxo de compartilhamento encerrado", {
          activityId: sessaoId,
          postId: existingPost.id,
          clubId: existingPost.club_id,
        });

        toast({
          title: "Atividade já compartilhada",
          description: "Esta atividade já foi publicada no feed de um clube.",
        });

        return;
      }

      const minutos = Math.max(1, Math.round((elapsedSeconds ?? 0) / 60));
      const distanceForClub = requiresDistance && usesGps && typeof gpsDistanceKm === "number" ? gpsDistanceKm : 0;

      const authorName = profileName || "Corredor";
      const authorInitials = authorName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("");

      const activityTypeName = activityType?.name || atividadeNome || "Atividade";

      const autoCaption =
        caption && caption.trim().length > 0
          ? caption
          : `${atividadeNome || "Corrida"} - ${minutos} min${distanceForClub && distanceForClub > 0 ? `, ${distanceForClub.toFixed(2)} km` : ""
          }`;

      console.log("[PersonalizarAtividade] Garantindo registro em running_club_activities para FK", {
        selectedClubId,
        minutos,
        distanceForClub,
        activityTypeName,
      });

      // Garante que exista uma atividade bruta vinculada ao clube para satisfazer o FK de club_posts.activity_id
      const { data: existingActivity, error: existingActivityError } = await supabase
        .from("running_club_activities")
        .select("id")
        .eq("id", sessaoId)
        .maybeSingle();

      if (existingActivityError) {
        if (isPermissionOrRlsError(existingActivityError)) {
          logPermissionError("running_club_activities", "select", existingActivityError);
          showError("Você não tem permissão para validar esta atividade no clube.", {
            title: "Permissão negada",
            description: "Entre em contato com o administrador do clube para ajustar suas permissões.",
          });
          return;
        }

        console.error("[PersonalizarAtividade] Erro ao verificar running_club_activities", existingActivityError);
      }

      if (!existingActivity) {
        const { error: insertActivityError } = await supabase.from("running_club_activities").insert({
          id: sessaoId,
          club_id: selectedClubId,
          user_id: user.id,
          distance_km: distanceForClub || 0,
          duration_minutes: minutos,
          recorded_at: new Date().toISOString(),
          author_name: authorName,
          author_initials: authorInitials || null,
          caption: autoCaption,
          activity_image_url: null,
        });

        if (insertActivityError) {
          if (isPermissionOrRlsError(insertActivityError)) {
            logPermissionError("running_club_activities", "insert", insertActivityError);
            showError("Você não tem permissão para registrar atividades neste clube.", {
              title: "Permissão negada",
              description: "Entre em contato com o administrador do clube para ajustar suas permissões.",
            });
            return;
          }

          // Se der erro diferente de chave duplicada, não seguimos porque o FK falhará
          const isDuplicateActivity =
            typeof insertActivityError.message === "string" &&
            (insertActivityError.message.includes("duplicate key") ||
              insertActivityError.message.includes("unique"));

          if (!isDuplicateActivity) {
            console.error(
              "[PersonalizarAtividade] Erro ao inserir running_club_activities para suporte ao FK",
              insertActivityError,
            );
            showError(insertActivityError.message, {
              title: "Não foi possível confirmar o compartilhamento",
              description: insertActivityError.message,
            });
            return;
          }
        }
      }

      console.log("[PersonalizarAtividade] Criando snapshot em club_posts", {
        selectedClubId,
        minutos,
        distanceForClub,
        activityTypeName,
      });

      // Se houver imagem gerada, primeiro fazemos o upload para o bucket running_activities
      // e usamos a URL pública diretamente no insert de club_posts. Também persistimos
      // essa URL em localStorage para reutilização em outros fluxos de compartilhamento.
      let publicImageUrl: string | null = null;

      if (generatedUrl) {
        try {
          console.log(
            "[PersonalizarAtividade] Iniciando upload da imagem gerada para o bucket running_activities (antes do insert)",
          );
          const blob = await fetch(generatedUrl).then((r) => r.blob());
          const filePath = `${user.id}/${sessaoId}-${Date.now()}.png`;

          const { error: uploadError } = await supabase.storage
            .from("running_activities")
            .upload(filePath, blob, { contentType: "image/png" });

          if (uploadError) {
            console.error("[PersonalizarAtividade] Erro ao fazer upload da imagem (não bloqueante)", uploadError);
          } else {
            const { data: publicData } = supabase.storage.from("running_activities").getPublicUrl(filePath);
            publicImageUrl = publicData?.publicUrl ?? null;
            console.log("[PersonalizarAtividade] Upload concluído, URL pública obtida", { publicImageUrl });

            if (publicImageUrl && typeof window !== "undefined") {
              try {
                window.localStorage.setItem(
                  "biotreiner_last_share_image",
                  JSON.stringify({ imageUrl: publicImageUrl, sessaoId }),
                );
              } catch (e) {
                console.warn(
                  "[PersonalizarAtividade] Falha ao salvar URL pública da imagem gerada no localStorage",
                  e,
                );
              }
            }
          }
        } catch (imageError) {
          console.error("[PersonalizarAtividade] Erro inesperado durante upload da imagem", imageError);
        }
      }

      const { data: postData, error: postError } = await supabase
        .from("club_posts")
        .insert({
          club_id: selectedClubId,
          user_id: user.id,
          activity_id: sessaoId,
          image_url: publicImageUrl,
          caption: autoCaption || "",
          activity_type: activityTypeName,
          distance_km: distanceForClub || null,
          duration_minutes: minutos,
          pace: activityCategory === "deslocamento" ? paceText : null,
          calories: caloriasEstimadas ?? null,
          author_name: authorName,
          author_initials: authorInitials || null,
          author_avatar_url: profileAvatarUrl ?? null,
        })
        .select(
          "id, club_id, user_id, activity_id, image_url, caption, created_at, distance_km, duration_minutes, pace, calories, activity_type, author_name, author_initials, author_avatar_url",
        )
        .single();

      if (postError || !postData) {
        if (postError && isPermissionOrRlsError(postError)) {
          logPermissionError("club_posts", "insert", postError);
          showError("Você não tem permissão para publicar atividades neste clube.", {
            title: "Permissão negada",
            description: "Entre em contato com o administrador do clube para ajustar suas permissões.",
          });
          return;
        }

        console.error("[PersonalizarAtividade] Erro ao criar post do clube (sem retries)", postError);

        const isDuplicate =
          typeof postError?.message === "string" &&
          (postError.message.includes("duplicate key") || postError.message.includes("unique"));

        if (isDuplicate) {
          toast({
            title: "Atividade já compartilhada",
            description: "Esta atividade já possui um post no feed do clube.",
          });

          return;
        }

        showError(postError?.message, {
          title: "Não foi possível confirmar o compartilhamento",
          description: "Se o post já existir, ele continuará aparecendo normalmente no feed do clube.",
        });

        return;
      }

      const newPost = {
        id: postData.id,
        club_id: postData.club_id,
        user_id: postData.user_id,
        activity_id: postData.activity_id,
        image_url: postData.image_url,
        caption: postData.caption,
        created_at: postData.created_at,
        distance_km: postData.distance_km ?? distanceForClub,
        duration_minutes: postData.duration_minutes ?? minutos,
        recorded_at: postData.created_at,
        author_name: postData.author_name ?? authorName,
        author_initials: (postData.author_initials ?? authorInitials) || null,
        activity_type: postData.activity_type ?? activityTypeName,
        calories: postData.calories ?? caloriasEstimadas ?? null,
        author_avatar_url: postData.author_avatar_url ?? profileAvatarUrl ?? null,
      };

      console.log("[PersonalizarAtividade] Post do clube criado com sucesso (snapshot)", {
        clubId: selectedClubId,
        postId: postData.id,
      });

      toast({
        title: "Workout shared with your club successfully!",
        description: "Seu treino foi publicado no feed social do clube.",
      });

      // Compartilhamento concluído com sucesso; permanecemos na tela de sucesso para ações adicionais

      void (async () => {
        if (!generatedUrl || publicImageUrl) {
          // Se já temos URL pública, não precisamos de novas ações em background.
          return;
        }
      })();
    } finally {
      setIsProcessing(false);
      shareOnceRef.current = false;
    }
  };

  const handleCompartilharRedes = async () => {
    if (!generatedUrl) return;

    const baseTitle = atividadeNome || "Atividade";
    const hasDistance = requiresDistance && usesGps && gpsDistanceKm && gpsDistanceKm > 0;
    const shareText = hasDistance
      ? `${baseTitle} - ${gpsDistanceKm?.toFixed(2)} km em ${durationText} (${paceText})`
      : `${baseTitle} - ${durationText}`;

    if (navigator.share) {
      try {
        const blob = await fetch(generatedUrl).then((r) => r.blob());
        const file = new File([blob], "nexfit-atividade.png", { type: "image/png" });
        await navigator.share({
          title: "Minha atividade na Nexfit",
          text: shareText,
          files: [file],
        });
      } catch (e) {
        console.warn("Compartilhamento cancelado ou não suportado", e);
      }
    } else {
      toast({
        title: "Compartilhamento não suportado",
        description: "Use o botão de download e compartilhe manualmente.",
      });
    }
  };

  const handleConcluir = async () => {
    const ok = await finalizeActivityAndSaveHistory();
    if (!ok) return;

    setModalOpen(false);
    setGenerationStep("idle");
    navigate("/aluno/dashboard", { replace: true, state: { showSharePrompt: true } });
  };
  return (
    <main className="safe-bottom-content flex min-h-screen flex-col bg-background px-4 pt-6">
      <header className="mb-2 flex items-center gap-3">
        <BackIconButton
          onClick={() =>
            navigate("/aluno/monitoramento", {
              state: {
                sessaoId,
                atividadeNome,
                activityType,
                caption,
                generatedUrl,
              },
            })
          }
        />
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.3em] text-accent-foreground/80">
            {showSuccessView ? "Treino concluído" : "Personalizar atividade"}
          </span>
          <h1 className="mt-1 page-title-gradient text-xl font-semibold tracking-tight">
            {showSuccessView ? "Seu treino foi salvo" : "Registre o momento"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {showSuccessView
              ? "Agora você pode publicar no clube, baixar a imagem ou finalizar."
              : "Adicione uma foto do seu treino e gere uma imagem estilosa com seus dados."}
          </p>
        </div>
      </header>

      {!showSuccessView ? (
        <section className="flex flex-1 flex-col gap-4">
          <Card className="border border-accent/60 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resumo da atividade</CardTitle>
              <CardDescription className="text-[11px]">
                {usesGps && activityCategory === "deslocamento"
                  ? "Dados coletados com GPS durante sua atividade."
                  : "Esses são os dados simulados da sua sessão."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <p>
                Atividade: <span className="font-semibold">{atividadeNome}</span>
              </p>
              <p>
                Duração: <span className="font-semibold">{durationText}</span>
              </p>

              {activityCategory === "deslocamento" && usesGps && gpsDistanceKm !== undefined && (
                <>
                  <p>
                    Distância (GPS): <span className="font-semibold">{gpsDistanceKm.toFixed(2)} km</span>
                  </p>
                  {gpsPaceAvg !== undefined && (
                    <p>
                      Ritmo médio: <span className="font-semibold">{paceText}</span>
                    </p>
                  )}
                </>
              )}

              {activityCategory === "estacionario" && intensidade && (
                <p>
                  Intensidade: <span className="font-semibold">{intensidade}</span>
                </p>
              )}

              <p>
                Frequência média: <span className="font-semibold">{Math.round(bpmMedio ?? 0)} bpm</span>
              </p>
              <p>
                Calorias estimadas: <span className="font-semibold">{Math.round(caloriasEstimadas ?? 0)} kcal</span>
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Foto e detalhes</CardTitle>
              <CardDescription className="text-[11px]">
                {requiresDistance && usesGps
                  ? "Distância calculada automaticamente via GPS. Escolha a foto do seu momento."
                  : "Escolha a foto que representa seu momento de treino."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {requiresDistance && usesGps && gpsDistanceKm !== undefined && (
                <div className="space-y-1 rounded-md border border-primary/30 bg-primary/5 p-3">
                  <Label className="text-[11px] font-medium text-primary">Distância (GPS)</Label>
                  <p className="text-lg font-semibold text-foreground">{gpsDistanceKm.toFixed(2)} km</p>
                  <p className="text-[10px] text-muted-foreground">
                    Calculada automaticamente durante a atividade
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="foto">Foto do momento</Label>
                <Input id="foto" type="file" accept="image/*" onChange={handleFileChange} />
                <p className="text-[11px] text-muted-foreground">
                  Escolha uma foto do treino (paisagem, selfie, esteira, etc.).
                </p>
              </div>

              {requiresDistance && (
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Ritmo estimado: <span className="font-semibold">{paceText}</span>
                  </p>
                </div>
              )}

              {usesGps && (
                <p className="text-[11px] text-muted-foreground">
                  A distância será calculada automaticamente durante o treino.
                </p>
              )}

              <div className="space-y-1">
                <Label htmlFor="caption">Legenda (opcional)</Label>
                <Textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Escreva algo sobre o seu treino..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-[11px] text-muted-foreground">
                  Essa legenda aparecerá junto com a imagem gerada quando você compartilhar.
                </p>
              </div>


              <Button
                className="w-full"
                loading={isProcessing}
                disabled={!file}
                onClick={() => {
                  void gerarImagem();
                }}
              >
                Próximo
              </Button>
            </CardContent>
          </Card>

          {generatedUrl && (
            <Card className="border border-accent/60 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Prévia da imagem</CardTitle>
                <CardDescription className="text-[11px]">
                  Baixe ou compartilhe a imagem nas redes sociais.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <img
                  src={generatedUrl}
                  alt="Imagem personalizada da atividade"
                  className="w-full rounded-lg border border-border/60"
                  loading="lazy"
                />
                <div className="grid grid-cols-1 gap-2">
                  <a
                    href={generatedUrl}
                    download="biotreiner-atividade.png"
                    className="inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Baixar imagem
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleCompartilharRedes}
                    disabled={isProcessing}
                  >
                    <Share2 className="mr-1 h-3 w-3" />
                    Compartilhar nas redes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      ) : (
        <section className="flex flex-1 flex-col gap-4">
          <Card className="border border-accent/60 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resumo visual do treino</CardTitle>
              <CardDescription className="text-[11px]">
                Esta é a imagem gerada com os dados da sua atividade.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {generatedUrl ? (
                <img
                  src={generatedUrl}
                  alt="Imagem do treino concluído"
                  className="w-full rounded-lg border border-border/60"
                  loading="lazy"
                />
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Gere uma imagem na etapa anterior para visualizar aqui ou apenas finalize o treino.
                </p>
              )}

              <div className="grid grid-cols-1 gap-2">
                {generatedUrl && (
                  <a
                    href={generatedUrl}
                    download="biotreiner-atividade.png"
                    className="inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Baixar imagem
                  </a>
                )}

                {/* Botão de compartilhamento em clube temporariamente desativado */}


                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  loading={isProcessing}
                  onClick={async () => {
                    const ok = await finalizeActivityAndSaveHistory();
                    if (ok) {
                      navigate("/aluno/dashboard", { replace: true });
                    }
                  }}
                >
                  Finalizar
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Componente oculto para geração da imagem 1080x1350 */}
      <div
        ref={previewRef}
        className="fixed -top-[2000px] left-0 h-[1350px] w-[1080px] overflow-hidden bg-background"
        aria-hidden="true"
      >
        {selectedImageUrl && (
          <ActivityShareCard
            backgroundUrl={selectedImageUrl}
            activityTitle={atividadeNome ?? "Atividade"}
            distanciaKm={distanceNumber}
            durationText={durationText}
            paceText={paceText}
            calorias={caloriasEstimadas ?? 0}
            activityDate={activityDateText}
            clubName={selectedClubName}
            activityCategory={activityCategory}
            intensidade={intensidade}
            userName={profileName}
            userAvatarUrl={profileAvatarUrl ?? undefined}
          />
        )}
      </div>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          // Impede fechar o modal por clique fora/ESC durante o processamento
          if (!open) {
            setModalOpen(false);
            return;
          }
          setModalOpen(true);
        }}
      >
        <DialogContent className="max-w-xs border border-border/60 bg-card/90 text-center">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {generationStep === "processing" ? "Gerando imagem do treino..." : "Imagem pronta para compartilhar"}
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {generationStep === "processing"
                ? "Estamos montando sua arte de compartilhamento com os dados da atividade."
                : "Veja a prévia da imagem e use as opções de compartilhamento após concluir o treino."}
            </DialogDescription>
          </DialogHeader>

          {generationStep === "processing" && (
            <div className="mt-4 space-y-2">
              <Progress value={generationProgress} className="h-1" />
              <p className="text-[11px] text-muted-foreground">Isso leva só alguns segundos.</p>
            </div>
          )}

          {generationStep === "done" && generatedUrl && (
            <div className="mt-4 space-y-3 text-xs">
              <img
                src={generatedUrl}
                alt="Prévia da imagem do treino"
                className="w-full rounded-md border border-border/60"
              />
              <a
                href={generatedUrl}
                download="biotreiner-atividade.png"
                className="inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Baixar imagem
              </a>
              <Button size="sm" variant="outline" className="w-full" onClick={handleConcluir} loading={isProcessing}>
                Finalizar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default AlunoPersonalizarAtividadePage;
