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
  // Using 'any' for complex JSON objects that map to JSONB in Supabase, 
  // but strictly typing specific known fields where possible is better.
  // For now, these mirror the database columns.
  gpsPoints?: any[];
  intensity?: { label: string | null };
  extras?: {
    generatedUrl?: string | null;
    caption?: string | null;
    legacy_sessao_id?: string;
  };
  timestamp: number; // Added when queuing
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
}

let db: IDBPDatabase<OfflineQueueDB> | null = null;

async function getDB(): Promise<IDBPDatabase<OfflineQueueDB>> {
  if (db) return db;

  db = await openDB<OfflineQueueDB>('biotreiner-offline', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('workoutQueue')) {
        db.createObjectStore('workoutQueue', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('activityCache')) {
        db.createObjectStore('activityCache', { keyPath: 'key' });
      }
    },
  });

  return db;
}

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

// Cache de atividades
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
