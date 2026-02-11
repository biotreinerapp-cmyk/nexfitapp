import { openDB } from "idb";
import type { SubscriptionPlan } from "@/lib/subscriptionPlans";

type PersistedModalState = {
  isOpen: boolean;
  desiredPlan: SubscriptionPlan;
};

type PersistedReceipt = {
  file: File;
  updatedAt: number;
};

const DB_NAME = "biotreiner_persistence";
const DB_VERSION = 1;
const STORE_FILES = "pix_upgrade_files";

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES);
      }
    },
  });
}

async function saveReceipt(storageKey: string, file: File | null) {
  const db = await getDb();
  if (!file) {
    await db.delete(STORE_FILES, storageKey);
    return;
  }
  const payload: PersistedReceipt = { file, updatedAt: Date.now() };
  await db.put(STORE_FILES, payload, storageKey);
}

async function loadReceipt(storageKey: string): Promise<File | null> {
  const db = await getDb();
  const data = (await db.get(STORE_FILES, storageKey)) as PersistedReceipt | undefined;
  if (!data?.file) return null;
  return data.file;
}

export async function persistPixUpgradeModalState(
  storageKey: string,
  snapshot: PersistedModalState & { receiptFile: File | null },
) {
  if (typeof window === "undefined") return;
  const modalState: PersistedModalState = {
    isOpen: snapshot.isOpen,
    desiredPlan: snapshot.desiredPlan,
  };

  window.localStorage.setItem(storageKey, JSON.stringify(modalState));
  await saveReceipt(storageKey, snapshot.receiptFile);
}

export async function loadPixUpgradeModalState(
  storageKey: string,
): Promise<(PersistedModalState & { receiptFile: File | null }) | null> {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;

  const parsed = JSON.parse(raw) as Partial<PersistedModalState>;
  if (!parsed || typeof parsed.isOpen !== "boolean") return null;

  const receiptFile = await loadReceipt(storageKey);

  return {
    isOpen: parsed.isOpen,
    desiredPlan: (parsed.desiredPlan as SubscriptionPlan) ?? "ADVANCE",
    receiptFile,
  };
}

export async function clearPixUpgradeModalState(storageKey: string) {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(storageKey);
  }
  const db = await getDb();
  await db.delete(STORE_FILES, storageKey);
}
