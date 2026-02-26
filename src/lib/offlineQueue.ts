import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface QueuedWorkout {
  id: string;
  userId: string;
  activityType: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  distanceKm?: number;
  calories: number;
  avgHr?: number;
  paceAvg?: number;
  gpsPoints?: any[];
  intensity?: { label: string | null };
  extras?: {
    generatedUrl?: string | null;
    caption?: string | null;
    legacy_sessao_id?: string;
  };
  timestamp: number;
}

export interface QueuedStrengthSession {
  id: string;           // workout_sessions.id (sessaoId)
  userId: string;
  exercicioNome: string;
  series: number;
  repetitions: number;
  totalReps: number;
  bpmMedio: number;
  caloriasEstimadas: number;
  finalizadoEm: string; // ISO string
  timestamp: number;
}

interface OfflineQueueDB extends DBSchema {
  workoutQueue: {
    key: string;
    value: QueuedWorkout;
  };
  activityCache: {
    key: string;
    value: {
      key: string;
      data: any;
      timestamp: number;
    };
  };
  strengthQueue: {
    key: string;
    value: QueuedStrengthSession;
  };
}

let db: IDBPDatabase<OfflineQueueDB> | null = null;

async function getDB(): Promise<IDBPDatabase<OfflineQueueDB>> {
  if (db) return db;

  db = await openDB<OfflineQueueDB>('biotreiner-offline', 2, {
    upgrade(db, oldVersion) {
      // Version 1 stores
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('workoutQueue')) {
          db.createObjectStore('workoutQueue', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('activityCache')) {
          db.createObjectStore('activityCache', { keyPath: 'key' });
        }
      }
      // Version 2: add strengthQueue for offline strength training sessions
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('strengthQueue')) {
          db.createObjectStore('strengthQueue', { keyPath: 'id' });
        }
      }
    },
  });

  return db;
}

// ─── Workout (Aerobic/Outdoor) Queue ────────────────────────────────────────

export async function enqueueWorkout(workout: Omit<QueuedWorkout, 'timestamp'>): Promise<void> {
  const database = await getDB();
  await database.put('workoutQueue', {
    ...workout,
    timestamp: Date.now(),
  });
  console.log('[OfflineQueue] Workout enfileirado:', workout.id);
}

export async function getQueuedWorkouts(): Promise<QueuedWorkout[]> {
  const database = await getDB();
  return await database.getAll('workoutQueue');
}

export async function removeQueuedWorkout(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('workoutQueue', id);
  console.log('[OfflineQueue] Workout removido da fila:', id);
}

export async function clearQueue(): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('workoutQueue', 'readwrite');
  await tx.store.clear();
  await tx.done;
  console.log('[OfflineQueue] Fila limpa');
}

// ─── Strength (Musculação) Queue ─────────────────────────────────────────────

export async function enqueueStrengthSession(session: Omit<QueuedStrengthSession, 'timestamp'>): Promise<void> {
  const database = await getDB();
  await database.put('strengthQueue', {
    ...session,
    timestamp: Date.now(),
  });
  console.log('[OfflineQueue] Sessão de musculação enfileirada:', session.id);
}

export async function getQueuedStrengthSessions(): Promise<QueuedStrengthSession[]> {
  const database = await getDB();
  return await database.getAll('strengthQueue');
}

export async function removeQueuedStrengthSession(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('strengthQueue', id);
  console.log('[OfflineQueue] Sessão de musculação removida da fila:', id);
}

// ─── Activity Cache ──────────────────────────────────────────────────────────

export async function cacheActivityList(key: string, data: any): Promise<void> {
  const database = await getDB();
  await database.put('activityCache', {
    key,
    data,
    timestamp: Date.now(),
  });
  console.log('[OfflineCache] Lista cacheada:', key);
}

export async function getCachedActivityList(key: string): Promise<any | null> {
  const database = await getDB();
  const cached = await database.get('activityCache', key);

  if (!cached) return null;

  // Cache válido por 24 horas
  const isExpired = Date.now() - cached.timestamp > 24 * 60 * 60 * 1000;
  if (isExpired) {
    await database.delete('activityCache', key);
    return null;
  }

  console.log('[OfflineCache] Lista recuperada do cache:', key);
  return cached.data;
}

export async function clearActivityCache(): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('activityCache', 'readwrite');
  await tx.store.clear();
  await tx.done;
  console.log('[OfflineCache] Cache limpo');
}
