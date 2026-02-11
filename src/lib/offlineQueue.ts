import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineQueueDB extends DBSchema {
  workoutQueue: {
    key: string;
    value: {
      id: string;
      userId: string;
      activityType: string;
      startedAt: string;
      endedAt?: string;
      durationSeconds?: number;
      distanceKm?: number;
      calories?: number;
      avgHr?: number;
      maxHr?: number;
      paceAvg?: number;
      gpsPolyline?: any;
      gpsPoints?: any;
      intensity?: any;
      equipment?: string[];
      notes?: string;
      extras?: any;
      timestamp: number;
    };
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

export async function enqueueWorkout(workout: any): Promise<void> {
  const database = await getDB();
  await database.put('workoutQueue', {
    ...workout,
    timestamp: Date.now(),
  });
  console.log('[OfflineQueue] Workout enfileirado:', workout.id);
}

export async function getQueuedWorkouts(): Promise<any[]> {
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
