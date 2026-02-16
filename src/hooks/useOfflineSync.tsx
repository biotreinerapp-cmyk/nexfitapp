import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getQueuedWorkouts, removeQueuedWorkout } from '@/lib/offlineQueue';
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

  const syncQueue = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    console.log('[OfflineSync] Iniciando sincronização...');

    try {
      const queued = await getQueuedWorkouts();

      if (queued.length === 0) {
        console.log('[OfflineSync] Nenhum item na fila');
        setIsSyncing(false);
        return;
      }

      console.log(`[OfflineSync] ${queued.length} treino(s) na fila`);

      let successCount = 0;

      for (const workout of queued) {
        try {
          // 1. Insert into workout_history
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
            continue; // Skip to next, keep in queue
          }

          // 2. Update session status (closed loop)
          // We try to update the session to "finalizada". If it doesn't exist or fails, 
          // we honestly don't care too much because the history is the source of truth for the user profile.
          // But we try anyway for consistency.
          const { error: sessionError } = await supabase
            .from("atividade_sessao")
            .upsert({
              id: workout.id,
              user_id: workout.userId,
              tipo_atividade: workout.activityType,
              status: "finalizada",
              confirmado: true,
              bpm_medio: workout.avgHr ?? null,
              calorias_estimadas: workout.calories,
              distance_km: workout.distanceKm,
              pace_avg: workout.paceAvg,
              route: workout.gpsPoints ?? null,
              finalizado_em: workout.endedAt,
            });

          if (sessionError) {
            console.warn(`[OfflineSync] Erro não-bloqueante ao atualizar sessão (${workout.id}):`, sessionError);
          }

          // 3. Success: Remove from queue and clear local cache
          await removeQueuedWorkout(workout.id);
          clearSessionLocalCaches(workout.userId, workout.id);
          console.log('[OfflineSync] Treino sincronizado com sucesso:', workout.id);
          successCount++;

        } catch (err) {
          console.error(`[OfflineSync] Exceção ao processar item (${workout.id}):`, err);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} treino(s) sincronizado(s)!`, {
          duration: 4000,
        });

        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Nexfit', {
              body: 'Seus treinos offline foram sincronizados com sucesso.',
              icon: '/favicon-new.png', // Ensure this path is correct in your public folder
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
