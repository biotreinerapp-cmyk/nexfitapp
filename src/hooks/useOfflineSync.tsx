import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  getQueuedWorkouts,
  removeQueuedWorkout,
  getQueuedStrengthSessions,
  removeQueuedStrengthSession,
} from '@/lib/offlineQueue';
import { toast } from 'sonner';

const clearSessionLocalCaches = (userId: string, sessionId: string) => {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove = [
      `biotreiner_activity_${userId}_${sessionId}`,
      `biotreiner_strength_${userId}_${sessionId}`,
      `biotreiner_personalizar_${userId}_${sessionId}`
    ];
    keysToRemove.forEach(key => window.localStorage.removeItem(key));
  } catch (e) {
    console.warn('[OfflineSync] Falha ao limpar caches locais da sessão', e);
  }
};

export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false);

  // ─── Aerobic / Outdoor workouts → workout_history ────────────────────────
  const syncWorkoutQueue = async () => {
    const queued = await getQueuedWorkouts();
    if (queued.length === 0) return 0;

    console.log(`[OfflineSync] ${queued.length} treino(s) aeróbico(s) na fila`);
    let successCount = 0;

    for (const workout of queued) {
      try {
        const { error: historyError } = await supabase
          .from('workout_history')
          .insert({
            user_id: workout.userId,
            activity_type: workout.activityType,
            source: 'app',
            privacy: 'public',
            started_at: workout.startedAt,
            ended_at: workout.endedAt,
            duration_seconds: workout.durationSeconds,
            distance_km: workout.distanceKm,
            calories: workout.calories,
            avg_hr: workout.avgHr,
            pace_avg: workout.paceAvg,
            gps_points: workout.gpsPoints,
            intensity: workout.intensity,
            extras: workout.extras,
          });

        if (historyError) {
          console.error(`[OfflineSync] Erro ao sincronizar histórico (${workout.id}):`, historyError);
          continue;
        }

        // Update session status (non-blocking)
        try {
          await supabase
            .from('atividade_sessao')
            .upsert({
              id: workout.id,
              user_id: workout.userId,
              tipo_atividade: workout.activityType,
              status: 'finalizada',
              confirmado: true,
              bpm_medio: workout.avgHr ?? null,
              calorias_estimadas: workout.calories,
              distance_km: workout.distanceKm,
              pace_avg: workout.paceAvg,
              route: workout.gpsPoints ?? null,
              finalizado_em: workout.endedAt,
            });
        } catch (sessionErr) {
          console.warn('[OfflineSync] Sessão update não-bloqueante:', sessionErr);
        }

        await removeQueuedWorkout(workout.id);
        clearSessionLocalCaches(workout.userId, workout.id);
        successCount++;
      } catch (err) {
        console.error(`[OfflineSync] Exceção ao processar treino aeróbico (${workout.id}):`, err);
      }
    }

    return successCount;
  };

  // ─── Strength (Musculação) sessions → workout_sessions ─────────────────────
  const syncStrengthQueue = async () => {
    const queued = await getQueuedStrengthSessions();
    if (queued.length === 0) return 0;

    console.log(`[OfflineSync] ${queued.length} sessão(ões) de musculação na fila`);
    let successCount = 0;

    for (const session of queued) {
      try {
        const { error } = await supabase
          .from('workout_sessions')
          .update({
            status: 'finalizada',
            finalizado_em: session.finalizadoEm,
            series: session.series,
            repetitions: session.repetitions,
            total_reps: session.totalReps,
            bpm_medio: session.bpmMedio,
            calorias_estimadas: session.caloriasEstimadas,
            confirmado: true,
          })
          .eq('id', session.id)
          .eq('user_id', session.userId);

        if (error) {
          console.error(`[OfflineSync] Erro ao sincronizar sessão de musculação (${session.id}):`, error);
          continue;
        }

        await removeQueuedStrengthSession(session.id);
        clearSessionLocalCaches(session.userId, session.id);
        successCount++;
        console.log('[OfflineSync] Sessão de musculação sincronizada:', session.id);
      } catch (err) {
        console.error(`[OfflineSync] Exceção ao processar musculação (${session.id}):`, err);
      }
    }

    return successCount;
  };

  const syncQueue = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    console.log('[OfflineSync] Iniciando sincronização...');

    try {
      const [aerobicCount, strengthCount] = await Promise.all([
        syncWorkoutQueue(),
        syncStrengthQueue(),
      ]);

      const totalSynced = aerobicCount + strengthCount;

      if (totalSynced > 0) {
        toast.success(`${totalSynced} treino(s) sincronizado(s)!`, { duration: 4000 });

        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Nexfit', {
              body: 'Seus treinos offline foram sincronizados com sucesso.',
              icon: '/favicon-new.png',
            });
          } catch {
            // Ignore notification errors
          }
        }
      }
    } catch (error) {
      console.error('[OfflineSync] Erro fatal na sincronização:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineSync] Conexão restaurada, sincronizando...');
      syncQueue();
    };

    window.addEventListener('online', handleOnline);

    // Sync on mount if online
    if (navigator.onLine) {
      syncQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return { isSyncing, syncQueue };
}
