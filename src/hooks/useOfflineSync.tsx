import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getQueuedWorkouts, removeQueuedWorkout } from '@/lib/offlineQueue';
import { toast } from 'sonner';

const clearSessionLocalCaches = (userId: string, sessionId: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`biotreiner_activity_${userId}_${sessionId}`);
    window.localStorage.removeItem(`biotreiner_strength_${userId}_${sessionId}`);
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

      for (const workout of queued) {
        try {
          const { error } = await supabase
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
              max_hr: workout.maxHr,
              pace_avg: workout.paceAvg,
              gps_polyline: workout.gpsPolyline,
              gps_points: workout.gpsPoints,
              intensity: workout.intensity,
              equipment: workout.equipment,
              notes: workout.notes,
              extras: workout.extras,
            });

          if (error) {
            console.error('[OfflineSync] Erro ao sincronizar:', error);
          } else {
            await removeQueuedWorkout(workout.id);
            clearSessionLocalCaches(workout.userId, workout.id);
            console.log('[OfflineSync] Treino sincronizado:', workout.id);
          }
        } catch (err) {
          console.error('[OfflineSync] Erro no item da fila:', err);
        }
      }

      // Notificação de sucesso
      toast.success('Treino atualizado! Sua atividade já está disponível no seu histórico.', {
        duration: 5000,
      });

      // Tenta enviar notificação do sistema
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Nexfit', {
          body: 'Treino atualizado! Sua atividade já está disponível no seu histórico.',
          icon: '/favicon-new.png',
        });
      }
    } catch (error) {
      console.error('[OfflineSync] Erro na sincronização:', error);
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

    // Sincroniza ao montar se estiver online
    if (navigator.onLine) {
      syncQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return { isSyncing, syncQueue };
}
