import type { CustomModel } from '../data/customModel';

/**
 * Persists the uploaded model in IndexedDB so it survives a page reload —
 * object URLs (and in-memory state) don't. The binary file and its small,
 * frequently-changing metadata (target/placement/tint/rotation) are kept in
 * separate stores so tweaking a swatch doesn't rewrite the whole blob.
 */

const DB_NAME = 'virtual-try-on';
const DB_VERSION = 1;
const BLOB_STORE = 'model-blob';
const META_STORE = 'model-meta';
const RECORD_KEY = 'current';

export interface StoredModelBlob {
  name: string;
  file: Blob;
}

export type StoredModelMeta = Omit<CustomModel, 'id' | 'name' | 'url'>;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE);
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction<T>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  run: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = run(tx.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Saves the uploaded file and its metadata; overwrites any previously stored model. */
export async function saveStoredModel(blob: StoredModelBlob, meta: StoredModelMeta): Promise<void> {
  const db = await openDb();
  try {
    await runTransaction(db, BLOB_STORE, 'readwrite', (s) => s.put(blob, RECORD_KEY));
    await runTransaction(db, META_STORE, 'readwrite', (s) => s.put(meta, RECORD_KEY));
  } finally {
    db.close();
  }
}

/** Updates just the metadata (target/placement/tint/rotation) for the already-stored model. */
export async function saveStoredModelMeta(meta: StoredModelMeta): Promise<void> {
  const db = await openDb();
  try {
    await runTransaction(db, META_STORE, 'readwrite', (s) => s.put(meta, RECORD_KEY));
  } finally {
    db.close();
  }
}

export async function loadStoredModel(): Promise<{ blob: StoredModelBlob; meta: StoredModelMeta } | null> {
  const db = await openDb();
  try {
    const blob = await runTransaction<StoredModelBlob | undefined>(db, BLOB_STORE, 'readonly', (s) => s.get(RECORD_KEY));
    if (!blob) return null;
    const meta = await runTransaction<StoredModelMeta | undefined>(db, META_STORE, 'readonly', (s) => s.get(RECORD_KEY));
    if (!meta) return null;
    return { blob, meta };
  } finally {
    db.close();
  }
}

export async function clearStoredModel(): Promise<void> {
  const db = await openDb();
  try {
    await runTransaction(db, BLOB_STORE, 'readwrite', (s) => s.delete(RECORD_KEY));
    await runTransaction(db, META_STORE, 'readwrite', (s) => s.delete(RECORD_KEY));
  } finally {
    db.close();
  }
}
