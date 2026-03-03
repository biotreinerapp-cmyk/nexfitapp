import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Share2, Camera, UploadCloud, Timer, Flame, Activity, MapPin, CheckCircle2 } from "lucide-react";
import html2canvas from "html2canvas";
import logoNexfit from "@/assets/nexfit-logo.png";
import type { ActivityType, ActivityCategory } from "@/lib/activityTypes";
import { getActivityTypeById } from "@/lib/activityTypes";
import { useFeedback } from "@/hooks/useFeedback";
import { isPermissionOrRlsError, logPermissionError } from "@/lib/supabaseClient";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { enqueueWorkout } from "@/lib/offlineQueue";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { Download } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface PersonalizarState {
  sessaoId?: string;
  atividadeNome?: string;
  elapsedSeconds?: number;
  bpmMedio?: number;
  caloriasEstimadas?: number;
  activityType?: ActivityType;
  intensidade?: string;
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
    <div className="relative h-[1350px] w-[1080px] overflow-hidden bg-[#0A0A0A] font-sans text-white">
      {backgroundUrl && (
        <img
          src={backgroundUrl}
          alt="Fundo do treino"
          className="absolute inset-0 h-full w-full object-cover scale-105"
          loading="eager"
        />
      )}

      {/* Cinematic Scrims */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/90 opacity-90 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-90" />

      <div className="relative flex h-full w-full flex-col p-14">
        {/* Superior Header */}
        <header className="flex items-start justify-between w-full">
          <img
            src={logoNexfit}
            alt="Logo Nexfit"
            className="h-12 w-auto drop-shadow-2xl [filter:brightness(0)_invert(1)]"
            loading="eager"
          />

          {/* Etiqueta Superior Direita (User Tag) Atualizada */}
          {(userName || userAvatarUrl) && (
            <div className="flex items-center gap-4 rounded-full bg-white/10 px-6 py-3 backdrop-blur-xl border border-white/20 shadow-2xl">
              <div className="text-right">
                <p className="text-xl font-black uppercase italic tracking-tight text-white drop-shadow-md">
                  {userName ?? "Atleta"}
                </p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-sm font-bold text-white/70 uppercase tracking-widest">
                    Nexfit
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-sm" />
                {userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt={userName ? `Foto de perfil de ${userName}` : "Foto de perfil"}
                    className="relative h-16 w-16 rounded-full border-2 border-primary object-cover shadow-lg"
                    loading="eager"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-black/60 text-lg font-black shadow-lg">
                    {userInitials || "NX"}
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Base Content (Informações da Atividade) */}
        <main className="mt-auto flex flex-col w-full pb-8">

          <div className="mb-10 w-full max-w-[850px]">
            {/* Data e Hora */}
            <div className="flex items-baseline gap-3 mb-6">
              <p className="text-2xl font-black uppercase text-white tracking-widest drop-shadow-md">
                {activityDate.split(' ')[0]} {/* Data */}
              </p>
              <p className="text-2xl font-black uppercase tracking-widest text-white/70 drop-shadow-md">
                {activityDate.split(' ')[1]} {/* Hora */}
              </p>
            </div>

            <h1 className="text-[72px] font-black italic uppercase leading-[0.9] tracking-tighter text-white drop-shadow-2xl break-words">
              {activityTitle}
            </h1>

            {(clubName || intensidade) && (
              <p className="mt-4 text-2xl font-medium text-white/80 drop-shadow-md flex items-center gap-2">
                {[clubName, intensidade].filter(Boolean).map((text, i, arr) => (
                  <span key={i} className="flex items-center">
                    {text}
                    {i < arr.length - 1 && <span className="mx-3 h-1.5 w-1.5 rounded-full bg-white/40" />}
                  </span>
                ))}
              </p>
            )}
          </div>

          <div className="h-px w-full bg-gradient-to-r from-white/20 to-transparent mb-10" />

          {/* Grid de Estatísticas Fortes e Elegantes (All White) */}
          <div className="flex items-end gap-16">
            {isGpsActivity ? (
              <>
                <div className="flex flex-col">
                  <span className="text-lg font-medium uppercase tracking-widest text-white mb-2">Distância</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[88px] font-black italic tracking-tighter leading-none text-white drop-shadow-xl">
                      {kmValue.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-3xl font-black uppercase text-white drop-shadow-md">km</span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-lg font-medium uppercase tracking-widest text-white mb-2">Pace Médio</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[56px] font-black italic tracking-tighter leading-none text-white drop-shadow-xl">
                      {paceText.split(" ")[0]}
                    </span>
                    <span className="text-2xl font-black uppercase text-white drop-shadow-md">/km</span>
                  </div>
                </div>
              </>
            ) : null}

            <div className="flex flex-col">
              <span className="text-lg font-medium uppercase tracking-widest text-white mb-2">Tempo Ativo</span>
              <span className="text-[56px] font-black italic tracking-tighter leading-none text-white drop-shadow-xl">
                {durationText}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-lg font-medium uppercase tracking-widest text-white mb-2">Gasto Calórico</span>
              <div className="flex items-baseline gap-2">
                <span className="text-[56px] font-black italic tracking-tighter leading-none text-white drop-shadow-xl">
                  {Math.round(calorias)}
                </span>
                <span className="text-2xl font-black uppercase text-white drop-shadow-md">kcal</span>
              </div>
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
  const { showError } = useFeedback();

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
  const [intensityValue, setIntensityValue] = useState<number>(5);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const finalizeOnceRef = useRef(false);
  const shareOnceRef = useRef(false);

  useEffect(() => {
    if (!sessaoId || !atividadeNome || !elapsedSeconds) {
      toast({
        title: "Sessão não encontrada",
        description: "Dados de atividade inválidos.",
        variant: "destructive",
      });
      navigate("/aluno/dashboard", { replace: true });
      return;
    }

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
        console.warn("Falha ao restaurar personalização do cache", error);
      }
    }
  }, [sessaoId, atividadeNome, elapsedSeconds, navigate, toast, user, state.caption, state.generatedUrl]);

  useEffect(() => {
    if (!user || !sessaoId || typeof window === "undefined") return;
    const storageKey = `biotreiner_personalizar_${user.id}_${sessaoId}`;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ caption: caption || "", generatedUrl: generatedUrl || null }));
    } catch { }
  }, [user, sessaoId, caption, generatedUrl]);

  const PROFILE_CACHE_KEY = useMemo(() => user ? `biotreiner_profile_cache_${user.id}` : null, [user]);

  const toDataUrl = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) return null;
      const blob = await res.blob();
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
      if (!navigator.onLine) {
        const cached = PROFILE_CACHE_KEY ? JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || "{}") : null;
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
        const avatarDataUrl = profile.avatar_url ? await toDataUrl(profile.avatar_url) : null;
        if (PROFILE_CACHE_KEY) {
          localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ nome: profile.nome ?? null, avatar_url: profile.avatar_url ?? null, avatar_data_url: avatarDataUrl }));
        }
        if (avatarDataUrl) setProfileAvatarUrl(avatarDataUrl);
      }

      if (!memberships || memberships.length === 0) {
        setClubs([]);
        return;
      }

      const clubIds = memberships.map((m) => m.club_id);
      const { data: clubsData } = await supabase.from("running_clubs").select("id, name").in("id", clubIds);
      const clubsList = (clubsData ?? []).map((c) => ({ id: c.id, name: c.name }));
      setClubs(clubsList);
      if (clubsList.length === 1) setSelectedClubId(clubsList[0].id);
    };
    void loadClubsAndProfile();
  }, [user, PROFILE_CACHE_KEY]);

  const durationText = useMemo(() => {
    if (!elapsedSeconds) return "00:00";
    const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, "0");
    const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [elapsedSeconds]);

  const distanceNumber = useMemo(() => {
    if (!requiresDistance) return 0;
    if (activityCategory === "deslocamento" && gpsDistanceKm != null && gpsDistanceKm > 0) return gpsDistanceKm;
    return 0;
  }, [requiresDistance, gpsDistanceKm, activityCategory]);

  const paceText = useMemo(() => {
    if (!elapsedSeconds || !requiresDistance || activityCategory !== "deslocamento") return "--";
    const normalizePace = (v: any) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) return null;
      const m = n > 80 ? n / 60 : n;
      return m >= 1 && m <= 120 ? m : null;
    };
    const derived = distanceNumber > 0 ? (elapsedSeconds / 60) / distanceNumber : null;
    const p = normalizePace(gpsPaceAvg) ?? normalizePace(derived);
    if (!p) return "--";
    const totalSec = p * 60;
    return `${Math.floor(totalSec / 60).toString().padStart(2, "0")}:${Math.round(totalSec % 60).toString().padStart(2, "0")} /km`;
  }, [elapsedSeconds, requiresDistance, gpsPaceAvg, activityCategory, distanceNumber]);

  const activityDateText = useMemo(() => {
    return new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }, []);

  const selectedClubName = useMemo(() => {
    if (selectedClubId) return clubs.find((c) => c.id === selectedClubId)?.name ?? null;
    if (clubs.length === 1) return clubs[0].name;
    return null;
  }, [clubs, selectedClubId]);

  const derivedIntensityLabel = useMemo(() => {
    if (intensityValue <= 3) return "Baixa";
    if (intensityValue <= 6) return "Moderada";
    if (intensityValue <= 8) return "Alta";
    return "Muito Alta";
  }, [intensityValue]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
      setSelectedImageUrl(URL.createObjectURL(f));
    }
  };

  const gerarImagem = async (): Promise<string | null> => {
    if (!user || !sessaoId || !elapsedSeconds) return null;
    if (!file || !selectedImageUrl) {
      toast({ title: "Foto necessária", description: "Escolha uma foto para gerar a arte." });
      return null;
    }

    setModalOpen(true);
    setGenerationStep("processing");
    setIsProcessing(true);
    setGenerationProgress(10);

    let progressInterval: number | undefined;

    try {
      const node = previewRef.current;
      if (!node) throw new Error("Preview node not found");

      await (document.fonts?.ready ?? Promise.resolve());
      await Promise.all(Array.from(node.querySelectorAll("img")).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      progressInterval = window.setInterval(() => setGenerationProgress(p => p < 90 ? p + 5 : p), 200);

      const canvas = await html2canvas(node, {
        width: 1080,
        height: 1350,
        scale: navigator.onLine ? 2 : 1.5,
        useCORS: navigator.onLine,
        allowTaint: !navigator.onLine,
        backgroundColor: "#000000",
      });

      const dataUrl = canvas.toDataURL("image/png", 0.95);
      setGeneratedUrl(dataUrl);
      setGenerationProgress(100);
      setGenerationStep("done");
      setModalOpen(false); // Close modal immediately
      return dataUrl;
    } catch (error: any) {
      showError(error?.message, { title: "Erro ao gerar imagem" });
      setGenerationStep("idle");
      return null;
    } finally {
      if (progressInterval) window.clearInterval(progressInterval);
      setIsProcessing(false);
    }
  };

  const finalizeActivityAndSaveHistory = async (): Promise<boolean> => {
    if (!user || !sessaoId) return false;
    if (finalizeOnceRef.current) return false;
    finalizeOnceRef.current = true;

    try {
      setIsProcessing(true);
      const activityTypeName = activityType?.name || atividadeNome || "Atividade";
      const normalizePace = (v: any) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0) return null;
        const m = n > 80 ? n / 60 : n;
        return m >= 1 && m <= 120 ? m : null;
      };

      const dist = requiresDistance && activityCategory === "deslocamento" && gpsDistanceKm && gpsDistanceKm > 0 ? gpsDistanceKm : null;
      const derivedPace = dist ? (Math.max(0, elapsedSeconds) / 60) / dist : null;
      const paceVal = normalizePace(gpsPaceAvg) ?? normalizePace(derivedPace);

      const endedAt = new Date().toISOString();
      const startedAt = new Date(Date.now() - Math.max(0, elapsedSeconds) * 1000).toISOString();

      if (!navigator.onLine) {
        await enqueueWorkout({
          id: sessaoId,
          userId: user.id,
          activityType: activityTypeName,
          startedAt,
          endedAt,
          durationSeconds: Math.max(0, elapsedSeconds),
          distanceKm: dist ?? undefined,
          calories: Math.round(caloriasEstimadas ?? 0),
          avgHr: bpmMedio ?? undefined,
          paceAvg: paceVal ?? undefined,
          gpsPoints: usesGps && gpsRoute && gpsRoute.length > 0 ? gpsRoute : undefined,
          intensity: { label: derivedIntensityLabel, rpe: intensityValue },
          extras: { generatedUrl: generatedUrl ?? null, caption: caption ?? null },
        });
        localStorage.removeItem(`biotreiner_activity_${user.id}_${sessaoId}`);
        toast({ title: "Treino salvo offline", description: "Sincronizaremos quando conectar." });
        setShowSuccessView(true);
        return true;
      }

      const { error: historyError } = await (supabase as any).from("workout_history").insert({
        user_id: user.id,
        activity_type: activityTypeName,
        source: "app",
        privacy: "public",
        started_at: startedAt,
        ended_at: endedAt,
        duration_seconds: Math.max(0, elapsedSeconds),
        distance_km: dist,
        calories: Math.round(caloriasEstimadas ?? 0),
        avg_hr: bpmMedio ?? null,
        pace_avg: paceVal,
        gps_points: usesGps && gpsRoute && gpsRoute.length > 0 ? gpsRoute : null,
        intensity: { label: derivedIntensityLabel, rpe: intensityValue },
        extras: { legacy_sessao_id: sessaoId, generatedUrl: generatedUrl ?? null, caption: caption ?? null },
      });

      if (historyError) {
        console.error("Erro ao salvar histórico:", historyError);
        throw historyError;
      }

      const { error: sessaoError } = await supabase.from("atividade_sessao").upsert({
        id: sessaoId,
        user_id: user.id,
        tipo_atividade: activityTypeName,
        status: "finalizada",
        confirmado: true,
        bpm_medio: bpmMedio ?? null,
        calorias_estimadas: Math.round(caloriasEstimadas ?? 0),
        distance_km: dist,
        pace_avg: paceVal,
        route: usesGps && gpsRoute && gpsRoute.length > 0 ? gpsRoute : null,
        finalizado_em: endedAt,
      });

      if (sessaoError) {
        console.warn("Erro ao atualizar sessão (não bloqueante):", sessaoError);
      }

      if (generatedUrl) {
        try {
          localStorage.setItem("biotreiner_last_share_image", JSON.stringify({ imageUrl: generatedUrl, sessaoId }));
        } catch (storageError) {
          console.warn("Storage quota exceeded, skipping share image persistence", storageError);
          // Try to clear old images to make space for next time
          try {
            localStorage.removeItem("biotreiner_last_share_image");
          } catch { }
        }
      }
      localStorage.removeItem(`biotreiner_activity_${user.id}_${sessaoId}`);

      toast({ title: "Treino concluído!" });
      setShowSuccessView(true);
      return true;
    } catch (error: any) {
      console.error("Falha ao finalizar treino:", error);
      toast({
        title: "Erro ao finalizar",
        description: "Ocorreu um erro ao salvar seu treino. Tente novamente.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
      finalizeOnceRef.current = false;
    }
  };

  const handleBaixarImagem = () => {
    if (!generatedUrl) return;
    try {
      const link = document.createElement("a");
      link.href = generatedUrl;
      link.download = `nexfit-treino-${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Imagem baixada", description: "Verifique a galeria do seu dispositivo." });
    } catch (err) {
      console.error("Erro ao baixar a imagem", err);
      toast({ title: "Erro ao baixar", description: "Não foi possível realizar o download da imagem.", variant: "destructive" });
    }
  };

  const handleConcluir = async () => {
    const ok = await finalizeActivityAndSaveHistory();
    if (ok) {
      setModalOpen(false);
      navigate("/aluno/dashboard", { replace: true, state: { showSharePrompt: true } });
    }
  };

  return (
    <main className="safe-bottom-main flex min-h-screen flex-col bg-background px-4 pb-32 pt-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-accent/5 blur-[120px]" />

      {/* Header */}
      <header className="mb-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <BackIconButton
            onClick={() => navigate("/aluno/monitoramento", { state: { sessaoId, atividadeNome, activityType, caption, generatedUrl } })}
          />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-foreground/80">
              {showSuccessView ? "CONCLUÍDO" : "FINALIZAR"}
            </p>
            <h1 className="mt-1 page-title-gradient text-2xl font-black uppercase tracking-tighter leading-none">
              {showSuccessView ? "Treino Salvo" : "Registrar"}
            </h1>
          </div>
        </div>
      </header>

      {!showSuccessView ? (
        <div className="flex flex-1 flex-col gap-6 relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">

          {/* Horizontal Stats Scroll */}
          <section className="w-full overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            <div className="flex gap-3 min-w-max">
              <div className="flex flex-col justify-center h-20 min-w-[100px] rounded-2xl border border-white/5 bg-white/[0.03] px-4 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <Timer className="h-3 w-3 text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Tempo</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">{durationText}</span>
              </div>

              {usesGps && gpsDistanceKm !== undefined && (
                <div className="flex flex-col justify-center h-20 min-w-[100px] rounded-2xl border border-white/5 bg-white/[0.03] px-4 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="h-3 w-3 text-emerald-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Dist</span>
                  </div>
                  <span className="text-xl font-bold tracking-tight text-foreground">{gpsDistanceKm.toFixed(2)}<span className="text-xs font-medium text-muted-foreground ml-1">km</span></span>
                </div>
              )}

              <div className="flex flex-col justify-center h-20 min-w-[100px] rounded-2xl border border-white/5 bg-white/[0.03] px-4 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Cal</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">{Math.round(caloriasEstimadas ?? 0)}</span>
              </div>

              <div className="flex flex-col justify-center h-20 min-w-[100px] rounded-2xl border border-white/5 bg-white/[0.03] px-4 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity className="h-3 w-3 text-red-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">BPM</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">{Math.round(bpmMedio ?? 0)}</span>
              </div>
            </div>
          </section>

          {/* Hero Upload Card */}
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black/40 shadow-2xl">
            {selectedImageUrl ? (
              <div className="relative h-[200px] w-full">
                <img src={selectedImageUrl} alt="Preview" className="h-full w-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                <Label
                  htmlFor="foto-input"
                  className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Camera className="h-5 w-5 text-white" />
                </Label>
              </div>
            ) : (
              <Label
                htmlFor="foto-input"
                className="flex h-[200px] w-full flex-col items-center justify-center gap-3 bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                  <UploadCloud className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground">Adicionar Foto</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Toque para escolher do álbum</p>
                </div>
              </Label>
            )}
            <Input id="foto-input" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            {/* Caption Input inside Card */}
            <div className="p-4 pt-2">
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Escreva uma legenda..."
                className="border-none bg-transparent text-sm font-medium placeholder:text-muted-foreground/50 focus-visible:ring-0 p-0 h-auto"
              />
            </div>
          </div>

          {/* Intensity Slider */}
          <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black/40 p-5 shadow-lg backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Nível de Esforço (RPE)</h3>
              <span className="rounded-full bg-primary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                {derivedIntensityLabel} ({intensityValue}/10)
              </span>
            </div>
            <Slider
              value={[intensityValue]}
              onValueChange={(val) => setIntensityValue(val[0])}
              max={10}
              min={1}
              step={1}
              className="py-4"
            />
            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-1">
              <span>Leve</span>
              <span>Moderado</span>
              <span>Intenso</span>
              <span>Extremo</span>
            </div>
          </div>

          <div className="mt-auto space-y-3 pb-4">
            {file && (
              <Button
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold tracking-wide shadow-lg shadow-purple-500/20"
                onClick={() => void gerarImagem()}
                loading={isProcessing}
              >
                {isProcessing ? "PROCESSANDO..." : "GERAR STORY"}
              </Button>
            )}

            {!file && (
              <Button
                variant="outline"
                className="w-full h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest"
                onClick={() => void handleConcluir()}
                loading={isProcessing}
              >
                Pular e Finalizar
              </Button>
            )}
          </div>

          {/* Generated Image Preview Card */}
          {generatedUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-6 animate-in fade-in duration-300">
              <div className="relative w-full max-w-sm overflow-hidden rounded-[32px] border border-white/10 bg-[#182229]/95 p-4 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-4 pl-2">
                  <h3 className="text-sm font-black uppercase tracking-wider">Preview</h3>
                  <Button variant="ghost" size="icon" onClick={() => setGeneratedUrl(null)} className="h-8 w-8 rounded-full"><span className="sr-only">Fechar</span>×</Button>
                </div>
                <img src={generatedUrl} className="w-full rounded-2xl border border-white/5 shadow-inner" />
                <div className="mt-4 grid gap-2">
                  <Button onClick={handleBaixarImagem} className="w-full h-12 rounded-xl font-bold bg-white text-black hover:bg-gray-200">
                    <Download className="mr-2 h-4 w-4" />
                    Baixar Imagem
                  </Button>
                  <Button variant="secondary" onClick={handleConcluir} loading={isProcessing} className="w-full h-12 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20">Finalizar Treino</Button>
                </div>
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Treino Registrado!</h2>
          <p className="text-sm text-muted-foreground max-w-[200px] mb-8">
            Sua atividade foi salva no histórico com sucesso.
          </p>
          <Button
            className="w-full max-w-xs h-14 rounded-2xl font-bold tracking-wide"
            onClick={() => navigate("/aluno/dashboard", { replace: true })}
          >
            VOLTAR AO INÍCIO
          </Button>
        </div>
      )}

      {/* Hidden Render Container */}
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
            intensidade={derivedIntensityLabel}
            userName={profileName}
            userAvatarUrl={profileAvatarUrl ?? undefined}
          />
        )}
      </div>

      {/* Premium Processing Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[280px] border-none bg-transparent shadow-none p-0 flex flex-col items-center justify-center outline-none">
          <VisuallyHidden>
            <DialogTitle>Gerando Imagem</DialogTitle>
            <DialogDescription>Aguarde enquanto sua imagem é processada.</DialogDescription>
          </VisuallyHidden>
          <div className="relative flex flex-col items-center justify-center gap-4 rounded-[32px] border border-white/10 bg-black/60 p-8 backdrop-blur-2xl shadow-2xl">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
              <div className="absolute inset-2 rounded-full bg-primary/20 blur-md animate-pulse"></div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Criando Arte</p>
              <p className="text-[10px] font-medium text-muted-foreground">Aguarde um momento...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FloatingNavIsland />
    </main>
  );
};



export default AlunoPersonalizarAtividadePage;
