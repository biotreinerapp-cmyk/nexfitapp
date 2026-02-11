import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { LocationTracker, type LocationIngestResult, type LocationPoint, type LocationTrackerMode } from "@/services/locationTracker";
import { getMovementConfidenceParams } from "@/lib/movementConfidence";
import { haversineMeters } from "@/lib/geoDistance";

const AlunoAtividadePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOnline } = useConnectionStatus({ silent: true });

  // Recebe dados da navegação
  const stateData =
    (location.state as {
      sessaoId?: string;
      atividadeNome?: string;
      activityType?: import("@/lib/activityTypes").ActivityType;
      caption?: string;
      generatedUrl?: string;
    } | null) ||
    null;
  const sessaoIdInicial = stateData?.sessaoId;
  const atividadeInicial = stateData?.atividadeNome;
  const activityTypeInicial = stateData?.activityType;

  const [selectedActivityType, setSelectedActivityType] = useState<import("@/lib/activityTypes").ActivityType | null>(
    activityTypeInicial || null,
  );
  const [selectedActivity, setSelectedActivity] = useState<string>(
    selectedActivityType?.name || atividadeInicial || "Atividade",
  );
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bpm, setBpm] = useState(82);
  const [calories, setCalories] = useState(0);
  const [intensity, setIntensity] = useState("Moderada");

  type MovementState = "moving" | "stationary" | "signal_weak";
  const [movementState, setMovementState] = useState<MovementState>("stationary");
  const movementStateRef = useRef<MovementState>("stationary");
  const [sessionId, setSessionId] = useState<string | null>(sessaoIdInicial || null);
  const [showSummary, setShowSummary] = useState(false);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [restFinished, setRestFinished] = useState(false);
  const [hasPendingFinalization, setHasPendingFinalization] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveOnceRef = useRef(false);
  // Distância total percorrida em km, calculada a partir dos pontos de GPS válidos
  const [distanceKm, setDistanceKm] = useState(0);
  // Indica se o cálculo de distância/ritmo está pausado por falta de movimento real
  const [isStationaryPaused, setIsStationaryPaused] = useState(false);
  // Acumula o tempo (em segundos) em que o usuário permanece abaixo dos limiares de movimento
  const stationaryTimeRef = useRef(0);

  const ACTIVITY_STORAGE_PREFIX = "biotreiner_activity_" as const;

  type ActivityCache = {
    userId: string;
    sessionId: string;
    atividadeNome: string;
    activityTypeId?: string;
    elapsedSeconds: number;
    bpm: number;
    calories: number;
    intensity: string;
    status: "idle" | "running" | "finished_not_saved";
    /** timestamp em ms do último save (usado para recompor o cronômetro após refresh) */
    lastTickAt: number;
    updatedAt: string;
    gpsPoints?: GpsPoint[];
    distanceKm?: number;
    restSeconds?: number | null;
    isStationaryPaused?: boolean;
    stationaryTimeSeconds?: number;
    movementState?: MovementState;
  };

  type GpsPoint = {
    lat: number;
    lng: number;
    timestamp: number;
    accuracy: number;
    speed?: number | null;
  };

  const getActivityStorageKey = (userId: string, sessaoId: string) =>
    `${ACTIVITY_STORAGE_PREFIX}${userId}_${sessaoId}`;

  const gpsWatchIdRef = useRef<number | null>(null);
  const [gpsPoints, setGpsPoints] = useState<GpsPoint[]>([]);
  const trackerRef = useRef<LocationTracker | null>(null);
  const [gpsDebug, setGpsDebug] = useState<LocationIngestResult | null>(null);

  // Distance accumulation for PWA (physics rule; independent from movementState)
  const lastDistancePointRef = useRef<{ lat: number; lng: number; accuracy: number } | null>(null);
  const lastDistanceSeenAtRef = useRef<number | null>(null);
  const [gpsPhysicsDebug, setGpsPhysicsDebug] = useState<{
    accuracy: number;
    deltaDistMeters: number;
    deltaTimeSeconds: number;
    accepted: boolean;
  } | null>(null);

  // Movement confirmation (mode-specific) - PWA-safe: do NOT rely on GPS timestamps.
  const acceptedCountRef = useRef(0);
  const rejectedCountRef = useRef(0);

  const gpsDebugEnabled = useMemo(() => {
    try {
      return new URLSearchParams(location.search).get("debugGps") === "1";
    } catch {
      return false;
    }
  }, [location.search]);

  const mode: LocationTrackerMode = useMemo(
    () => (selectedActivityType?.id as LocationTrackerMode) || "default",
    [selectedActivityType?.id],
  );

  const movementParams = useMemo(() => getMovementConfidenceParams(mode), [mode]);

  // Keep a ref in sync to avoid re-creating GPS watchers due to state dependencies.
  useEffect(() => {
    movementStateRef.current = movementState;
  }, [movementState]);

  // Redireciona se não houver dados de sessão (tentando recuperar do cache primeiro)
  useEffect(() => {
    if (!user) return;

    const restoreFromAnyCache = () => {
      try {
        const prefix = `${ACTIVITY_STORAGE_PREFIX}${user.id}_`;
        const candidates: ActivityCache[] = [];

        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (!key || !key.startsWith(prefix)) continue;
          const raw = window.localStorage.getItem(key);
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw) as ActivityCache;
            if (parsed?.userId === user.id) {
              candidates.push(parsed);
            }
          } catch {
            // ignore
          }
        }

        if (!candidates.length) return null;

        candidates.sort((a, b) => {
          const aT = a.lastTickAt ?? new Date(a.updatedAt).getTime();
          const bT = b.lastTickAt ?? new Date(b.updatedAt).getTime();
          return bT - aT;
        });

        // Preferimos uma sessão ainda em execução ou com finalização pendente
        const picked =
          candidates.find((c) => c.status === "running") ??
          candidates.find((c) => c.status === "finished_not_saved") ??
          candidates[0];

        return picked ?? null;
      } catch {
        return null;
      }
    };

    // Se não vier state via navigation (ex: refresh), tentamos recuperar o que estava em andamento.
    if (!sessaoIdInicial || !atividadeInicial) {
      const cached = restoreFromAnyCache();
      if (!cached) {
        toast({
          title: "Sessão não encontrada",
          description: "Por favor, selecione uma atividade primeiro.",
          variant: "destructive",
        });
        navigate("/aluno/monitoramento", { replace: true });
        return;
      }

      setSessionId(cached.sessionId);
      setSelectedActivity(cached.atividadeNome || "Atividade");

      // Se houver um tipo de atividade no cache, tentamos reconstruir o objeto mínimo.
      if (cached.activityTypeId) {
        setSelectedActivityType((prev) => prev ?? { id: cached.activityTypeId, name: cached.atividadeNome, category: "estacionario", usesGps: false, usesDistance: false });
      }
    }
  }, [user, sessaoIdInicial, atividadeInicial, navigate, toast]);

  // Restaura progresso ou finalização pendente a partir do cache
  useEffect(() => {
    if (!user) return;
    if (!sessionId && !sessaoIdInicial) return;
    if (typeof window === "undefined") return;

    const resolvedSessionId = sessionId ?? sessaoIdInicial ?? null;
    if (!resolvedSessionId) return;

    try {
      const key = getActivityStorageKey(user.id, resolvedSessionId);
      const stored = window.localStorage.getItem(key);
      if (!stored) return;

      const cached = JSON.parse(stored) as ActivityCache;

      const now = Date.now();
      const lastTickAt = cached.lastTickAt ?? new Date(cached.updatedAt).getTime();
      const deltaSeconds = Math.max(0, Math.floor((now - lastTickAt) / 1000));
      const shouldCatchUp = cached.status === "running";

      setElapsedSeconds((cached.elapsedSeconds ?? 0) + (shouldCatchUp ? deltaSeconds : 0));
      setBpm(cached.bpm ?? 82);
      // Evita evoluir calorias no restore se não estávamos em movimento real.
      setCalories((cached.calories ?? 0) + (shouldCatchUp && cached.movementState === "moving" ? deltaSeconds * 0.15 : 0));
      setIntensity(cached.intensity ?? "Moderada");
      setSessionId(cached.sessionId);

      if (cached.movementState) {
        setMovementState(cached.movementState);
      }

      if (cached.atividadeNome) {
        setSelectedActivity(cached.atividadeNome);
      }

      if (cached.activityTypeId) {
        setSelectedActivityType((prev) =>
          prev ?? {
            id: cached.activityTypeId,
            name: cached.atividadeNome,
            category: "estacionario",
            usesGps: false,
            usesDistance: false,
          },
        );
      }

      if (Array.isArray(cached.gpsPoints)) {
        setGpsPoints(cached.gpsPoints);
      }
      if (typeof cached.distanceKm === "number") {
        setDistanceKm(cached.distanceKm);
      }
      if (typeof cached.restSeconds !== "undefined") {
        setRestSeconds(cached.restSeconds);
      }
      if (typeof cached.isStationaryPaused === "boolean") {
        setIsStationaryPaused(cached.isStationaryPaused);
      }
      if (typeof cached.stationaryTimeSeconds === "number") {
        stationaryTimeRef.current = cached.stationaryTimeSeconds;
      }

      if (cached.status === "running") {
        setIsRunning(true);
      }

      if (cached.status === "finished_not_saved") {
        setShowSummary(true);
        setHasPendingFinalization(true);

        (async () => {
          // Se estiver offline, mantemos o cache local e não tentamos escrever no Supabase.
          if (!navigator.onLine) {
            console.log("[AlunoAtividade] Offline: mantendo finalização pendente no cache local");
            return;
          }

          try {
            await (supabase as any)
              .from("atividade_sessao")
              .update({
                status: "finalizada",
                finalizado_em: new Date().toISOString(),
                bpm_medio: cached.bpm ?? null,
                calorias_estimadas: Math.round(cached.calories ?? 0),
                confirmado: true,
              })
              .eq("id", cached.sessionId);

            window.localStorage.removeItem(key);
            setHasPendingFinalization(false);
          } catch (error) {
            console.error("Falha ao finalizar sessão a partir do cache", error);
          }
        })();
      }
    } catch (error) {
      console.error("Erro ao restaurar progresso da atividade", error);
    }
  }, [user, sessaoIdInicial, sessionId]);
 
  useEffect(() => {
    let interval: number | undefined;

    if (isRunning) {
      interval = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
        // Métricas que dependem de deslocamento real só evoluem quando movementState === 'moving'
        if (movementState === "moving") {
          setBpm((prev) => {
            const variation = Math.round((Math.random() - 0.5) * 6);
            const next = Math.min(180, Math.max(60, prev + variation));
            return next;
          });
          setCalories((prev) => prev + 0.15);
          setIntensity(() => {
            if (bpm > 150) return "Alta";
            if (bpm > 120) return "Moderada";
            return "Leve";
          });
        }
      }, 1000);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isRunning, bpm, movementState]);

  // Coleta de GPS em tempo real (somente para atividades com GPS)
  useEffect(() => {
    if (!selectedActivityType?.usesGps) {
      return;
    }

    if (!("geolocation" in navigator)) {
      console.warn("Geolocalização não é suportada neste dispositivo/navegador.");
      return;
    }

    if (!isRunning) {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }

      // Reset tracker when stopping to avoid carrying anchors across sessions.
      trackerRef.current = null;

      // Reset distance anchors when stopping to avoid large jumps on resume.
      lastDistancePointRef.current = null;
      lastDistanceSeenAtRef.current = null;

      // Reset confirmation state when stopping.
      acceptedCountRef.current = 0;
      rejectedCountRef.current = 0;
      return;
    }

    trackerRef.current = new LocationTracker({
      mode,
      ...movementParams.trackerOverrides,
    });

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        const rawPoint: LocationPoint = {
          lat: latitude,
          lng: longitude,
          accuracy: accuracy ?? Number.POSITIVE_INFINITY,
          timestamp: position.timestamp,
          // PWA: ignore coords.speed entirely (unreliable on Chrome/webviews)
          speed: null,
        };

        const tracker = trackerRef.current;
        if (!tracker) return;

        const result = tracker.ingest(rawPoint);
        if (gpsDebugEnabled) setGpsDebug(result);

        // =====================
        // Distance accumulation (PHYSICAL RULE)
        // =====================
        // Must not depend on movementState, speed, or confirmation.
        // Rule: accumulate when accuracy<=50m, Δd>=2m, Δt>=1s.
        const nowSeenAt = Date.now();
        const prevSeenAt = lastDistanceSeenAtRef.current;
        const deltaTimeSeconds = prevSeenAt ? (nowSeenAt - prevSeenAt) / 1000 : 0;
        lastDistanceSeenAtRef.current = nowSeenAt;

        const currentAcc = rawPoint.accuracy;
        const prevGood = lastDistancePointRef.current;

        let deltaDistMeters = 0;
        if (prevGood) {
          deltaDistMeters = haversineMeters({ lat: prevGood.lat, lng: prevGood.lng }, { lat: rawPoint.lat, lng: rawPoint.lng });
        }

        const canAccumulate =
          currentAcc <= 50 &&
          prevGood !== null &&
          prevGood.accuracy <= 50 &&
          Number.isFinite(deltaDistMeters) &&
          deltaDistMeters >= 2 &&
          Number.isFinite(deltaTimeSeconds) &&
          deltaTimeSeconds >= 1;

        if (gpsDebugEnabled) {
          setGpsPhysicsDebug({
            accuracy: currentAcc,
            deltaDistMeters: Number.isFinite(deltaDistMeters) ? deltaDistMeters : 0,
            deltaTimeSeconds: Number.isFinite(deltaTimeSeconds) ? deltaTimeSeconds : 0,
            accepted: canAccumulate,
          });
        }

        if (canAccumulate) {
          const deltaKm = deltaDistMeters / 1000;
          setDistanceKm((current) => current + deltaKm);

          // Route points used for saving summary; store only when we truly accumulated distance.
          setGpsPoints((prev) => [
            ...prev,
            {
              lat: rawPoint.lat,
              lng: rawPoint.lng,
              accuracy: rawPoint.accuracy,
              timestamp: rawPoint.timestamp,
              speed: null,
            },
          ]);
        }

        // Update the distance anchor only when we have a good accuracy sample.
        if (currentAcc <= 50) {
          lastDistancePointRef.current = { lat: rawPoint.lat, lng: rawPoint.lng, accuracy: currentAcc };
        }

        // Estado único de movimento derivado do LocationTracker, com confirmação por contagem de pontos.
        const currentMovementState = movementStateRef.current;
        let nextMovementState: MovementState = currentMovementState;

        if (result.reason === "weak_signal_accuracy") {
          acceptedCountRef.current = 0;
          rejectedCountRef.current = 0;
          nextMovementState = "signal_weak";
        } else if (result.accepted) {
          acceptedCountRef.current += 1;
          rejectedCountRef.current = 0;

          if (acceptedCountRef.current >= movementParams.minAcceptedPointsToMove) {
            nextMovementState = "moving";
          }
        } else {
          // Any non-accepted point (except weak signal handled above) counts towards "stop" confirmation.
          rejectedCountRef.current += 1;
          acceptedCountRef.current = 0;

          if (rejectedCountRef.current >= movementParams.minRejectedPointsToStop) {
            nextMovementState = "stationary";
          }
        }

        if (nextMovementState !== currentMovementState) {
          movementStateRef.current = nextMovementState;
          setMovementState(nextMovementState);
        }

        // Weak signal / anti-jump should not force pause. We only mark paused once state is confirmed stationary.
        // (Distance accumulation is now independent and handled above.)
        if (nextMovementState === "moving") {
          stationaryTimeRef.current = 0;
          setIsStationaryPaused(false);
        } else if (nextMovementState === "stationary") {
          setIsStationaryPaused(true);
        }
      },
      (error) => {
        console.error("Erro ao obter localização em tempo real", error);
        // Mensagem amigável em caso de erro/permissão negada, sem quebrar o treino
        if (error.code === error.PERMISSION_DENIED) {
          toast({
            title: "Localização desativada",
            description: "Não foi possível acessar o GPS. Sua atividade continuará normalmente sem distância automática.",
            variant: "destructive",
          });
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      },
    );

    gpsWatchIdRef.current = watchId;

    return () => {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }

      trackerRef.current = null;
    };
  }, [isRunning, selectedActivityType?.usesGps, mode, movementParams, gpsDebugEnabled, toast]);

  // Persiste o progresso da sessão em tempo real (inclui dados para recuperação perfeita após refresh)
  useEffect(() => {
    if (!user || !sessionId) return;
    if (typeof window === "undefined") return;

    const key = getActivityStorageKey(user.id, sessionId);

    const status: ActivityCache["status"] = isRunning
      ? "running"
      : !isRunning && showSummary && elapsedSeconds > 0
        ? "finished_not_saved"
        : "idle";

    const payload: ActivityCache = {
      userId: user.id,
      sessionId,
      atividadeNome: selectedActivity,
      activityTypeId: selectedActivityType?.id,
      elapsedSeconds,
      bpm,
      calories,
      intensity,
      status,
      lastTickAt: Date.now(),
      updatedAt: new Date().toISOString(),
      gpsPoints,
      distanceKm,
      restSeconds,
      isStationaryPaused,
      stationaryTimeSeconds: stationaryTimeRef.current,
      movementState,
    };

    try {
      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch (error) {
      console.error("Falha ao salvar progresso da atividade no cache", error);
    }
  }, [
    user,
    sessionId,
    selectedActivity,
    selectedActivityType?.id,
    elapsedSeconds,
    bpm,
    calories,
    intensity,
    isRunning,
    showSummary,
    gpsPoints,
    distanceKm,
    restSeconds,
    isStationaryPaused,
    movementState,
  ]);

  // Alerta de confirmação ao tentar sair com dados não salvos
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingFinalization) return;
      event.preventDefault();
      event.returnValue = "Você tem dados não salvos";
      return "Você tem dados não salvos";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasPendingFinalization]);

  useEffect(() => {
    if (restSeconds === null) return;

    if (restSeconds === 0) {
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.001, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
          oscillator.connect(gain);
          gain.connect(ctx.destination);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.4);
        }
      } catch (e) {
        console.warn("Falha ao tocar alerta sonoro de descanso", e);
      }

      setRestFinished(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setRestSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [restSeconds]);

  const handleStartStop = async () => {
    if (!user || !sessionId) return;

    if (isRunning) {
      setIsRunning(false);
      setShowSummary(true);
      setHasPendingFinalization(true);
    } else {
      setIsRunning(true);
      setHasPendingFinalization(false);
      toast({ title: "Monitorando", description: "A IA Nexfit está acompanhando sua sessão em tempo real." });
    }
  };

  const handleSave = async () => {
    if (!user || !sessionId) {
      toast({
        title: "Sessão não encontrada",
        description: "Finalize uma atividade antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    // Bloqueia clique duplo (state + ref síncrona)
    if (saveOnceRef.current || isSaving) return;
    saveOnceRef.current = true;
    setIsSaving(true);

    try {
      // A partir de agora, o registro definitivo da atividade (atividade_sessao)
      // é feito apenas na etapa de personalização/"Finalizar".
      // Aqui apenas encaminhamos o usuário com todos os dados necessários.
      navigate("/aluno/atividade-personalizar", {
        replace: false,
        state: {
          sessaoId: sessionId,
          atividadeNome: selectedActivity,
          elapsedSeconds,
          bpmMedio: bpm,
          caloriasEstimadas: calories,
          activityType: selectedActivityType || undefined,
          intensidade: intensity,
          // Dados de GPS (apenas para atividades com GPS ativo)
          distanceKm: usesGps ? distanceKm : undefined,
          paceAvg: paceMinutesPerKm ?? undefined,
          gpsRoute: usesGps && gpsPoints.length > 0 ? gpsPoints : undefined,
          // Dados de personalização já existentes (se houver)
          caption: stateData?.caption,
          generatedUrl: stateData?.generatedUrl,
        },
      });
    } finally {
      // Em caso de navegação, o componente desmonta. Se não desmontar (falha rara), reabilita.
      setIsSaving(false);
      saveOnceRef.current = false;
    }
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  // Categoria da atividade para definir quais métricas exibir no resumo
  const activityCategory = selectedActivityType?.category;
  const isDeslocamento = activityCategory === "deslocamento";
  const isEstacionario = activityCategory === "estacionario";

  // Indica se a atividade atual utiliza GPS para cálculo automático de distância
  const usesGps = selectedActivityType?.usesGps === true && !isEstacionario;

  // Calcula o ritmo médio (pace) em min/km com base na distância de GPS,
  // mas apenas quando há movimento real (evita pace variando parado/sinal fraco)
  // PWA rule: show pace only after a minimum distance per modality.
  const minDistanceBeforePaceKm = useMemo(() => {
    if (mode === "corrida") return 0.05;
    if (mode === "caminhada") return 0.07;
    return 0.05;
  }, [mode]);
  const paceMinutesPerKm =
    usesGps && distanceKm >= minDistanceBeforePaceKm && movementState === "moving" && !isStationaryPaused
      ? (elapsedSeconds / 60) / distanceKm
      : null;

  const formatPace = (pace: number | null) => {
    if (!pace || !Number.isFinite(pace)) return "--";

    const totalSecondsPerKm = pace * 60;
    const minutes = Math.floor(totalSecondsPerKm / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.round(totalSecondsPerKm % 60)
      .toString()
      .padStart(2, "0");

    return `${minutes}:${seconds} /km`;
  };
  return (
    <main className="safe-bottom-content flex min-h-screen flex-col bg-background px-4 py-8">
      <section className="flex flex-1 flex-col gap-6 animate-fade-in">
        {hasPendingFinalization && (
          <div className="mb-3 rounded-md border border-accent/60 bg-card/80 px-3 py-2 text-[11px]">
            <p className="text-xs font-semibold text-foreground">Você tem dados não salvos</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Não atualize ou feche esta tela antes de concluir o salvamento da sua sessão. Toque em
              &nbsp;
              <span className="font-semibold">"Salvar atividade"</span> para finalizar o registro.
            </p>
          </div>
        )}

        <header className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-accent-foreground/80">Monitoramento ativo</p>
            {!isOnline && (
              <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                Offline
              </Badge>
            )}
          </div>
          <div className="inline-flex items-center justify-center rounded-full border border-primary/40 bg-card/80 px-4 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-primary/90">
            Sessão de treino
          </div>
          <h1 className="mt-1 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
            {selectedActivity}
          </h1>
          <p className="text-xs text-muted-foreground">A IA Nexfit está lendo seus sinais em tempo real.</p>
        </header>

        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-accent/40 bg-card/80 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
            <div className="absolute inset-3 rounded-full border border-primary/40" />
            <div className="absolute inset-6 rounded-full border border-accent/40 opacity-60" />
            <span className="text-3xl font-semibold tabular-nums text-primary">{formatTime(elapsedSeconds)}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={isRunning ? "outline" : "default"}
              size="lg"
              className="px-8"
              onClick={handleStartStop}
            >
              {isRunning ? "Parar" : "Iniciar/Pausar"}
            </Button>
            <Button
              variant={restSeconds !== null ? "default" : "secondary"}
              size="lg"
              className="px-6 font-semibold"
              onClick={() => {
                setRestFinished(false);
                setRestSeconds(60);
              }}
            >
              Descanso
            </Button>
          </div>
        </div>

        {restSeconds !== null && (
          <div className="mt-2 flex flex-col items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary/40 bg-muted">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background text-sm font-semibold tabular-nums">
                {String(restSeconds).padStart(2, "0")}s
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Descanso entre séries</p>
            {restFinished && <p className="text-xs font-semibold text-primary">Hora da próxima série!</p>}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 text-xs">
          <Card className="border border-primary/60 bg-card/80">
            <CardContent className="flex flex-col items-center justify-center gap-1 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Frequência</p>
              <div className="flex items-end gap-1 text-primary pulse">
                <span className="text-xl font-semibold tabular-nums">{bpm}</span>
                <span className="text-[10px]">bpm</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-accent/60 bg-card/80">
            <CardContent className="flex flex-col items-center justify-center gap-1 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Calorias</p>
              <span className="text-xl font-semibold tabular-nums text-accent">{Math.round(calories)}</span>
            </CardContent>
          </Card>
          <Card className="border border-accent/40 bg-card/80">
            <CardContent className="flex flex-col items-center justify-center gap-1 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Intensidade</p>
              <span className="text-xs font-medium text-foreground">{intensity}</span>
            </CardContent>
          </Card>
        </div>

        {usesGps && (
          <div className="mt-1 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <Card className="border border-primary/50 bg-card/80">
                <CardContent className="flex flex-col items-center justify-center gap-1 py-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Distância (GPS)</p>
                  <span className="text-xl font-semibold tabular-nums text-primary">
                    {distanceKm.toFixed(2)} km
                  </span>
                </CardContent>
              </Card>
              <Card className="border border-primary/30 bg-card/80">
                <CardContent className="flex flex-col items-center justify-center gap-1 py-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Ritmo médio</p>
                  <span className="text-xl font-semibold tabular-nums text-primary">
                    {formatPace(paceMinutesPerKm)}
                  </span>
                </CardContent>
              </Card>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Distância calculada automaticamente pelo GPS.
            </p>
          </div>
        )}

        {showSummary && (
          <Card className="mt-2 border border-accent/50 bg-card/90 animate-fade-in">
            <CardHeader>
              <CardTitle className="text-sm">Resumo da sessão</CardTitle>
              <CardDescription>Revise os dados simulados antes de salvar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p>
                Duração: <span className="font-semibold">{formatTime(elapsedSeconds)}</span>
              </p>
              <p>
                Frequência média (simulada): <span className="font-semibold">{bpm} bpm</span>
              </p>
              <p>
                Calorias estimadas: <span className="font-semibold">{Math.round(calories)} kcal</span>
              </p>

              {isDeslocamento && usesGps && (
                <>
                  <p>
                    Distância (GPS): <span className="font-semibold">{distanceKm.toFixed(2)} km</span>
                  </p>
                  <p>
                    Ritmo médio: <span className="font-semibold">{formatPace(paceMinutesPerKm)}</span>
                  </p>
                </>
              )}

              {isEstacionario && (
                <p>
                  Intensidade: <span className="font-semibold">{intensity}</span>
                </p>
              )}

              <Button className="mt-2 w-full" size="sm" onClick={handleSave} loading={isSaving}>
                Salvar atividade
              </Button>
            </CardContent>
          </Card>
        )}

        <footer className="mt-auto flex justify-center gap-2 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/aluno/dashboard")}
            disabled={isRunning}
          >
            Ir para o dashboard
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/aluno/monitoramento")}
            disabled={isRunning}
          >
            Trocar atividade
          </Button>
        </footer>
      </section>

      {gpsDebugEnabled && gpsDebug && (
        <div className="fixed bottom-2 right-2 z-50 max-w-[92vw] rounded-md border border-border bg-background/90 p-2 text-[10px] text-foreground shadow-md backdrop-blur">
          <div className="font-semibold">GPS debug</div>
          <div>modalidade: {movementParams.mode}</div>
          <div>movement: {movementState}</div>
          <div>
            counts: accepted {acceptedCountRef.current} / {movementParams.minAcceptedPointsToMove} | rejected {rejectedCountRef.current} / {movementParams.minRejectedPointsToStop}
          </div>
          <div>reason: {gpsDebug.reason}</div>
          <div>
            thresholds: minSpeed {movementParams.trackerOverrides.minSpeedMps} m/s | minStep {movementParams.trackerOverrides.minStepMeters} m | minPaceDist {Math.round(minDistanceBeforePaceKm * 1000)} m
          </div>
          <div>acc: {Math.round(gpsPhysicsDebug?.accuracy ?? gpsDebug.point.accuracy)} m</div>
          <div>Δd: {Math.round(gpsPhysicsDebug?.deltaDistMeters ?? gpsDebug.deltaDistMeters)} m</div>
          <div>acumulado: {distanceKm.toFixed(3)} km</div>
        </div>
      )}
    </main>
  );
};

export default AlunoAtividadePage;
