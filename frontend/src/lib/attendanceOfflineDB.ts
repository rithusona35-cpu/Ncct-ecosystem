/**
 * IndexedDB storage layer for offline-first attendance kiosk synchronization.
 * Handles persistent offline queueing when backend is unreachable,
 * and batch deletion upon successful backend sync.
 */

export interface OfflineAttendanceRecord {
  id?: number;
  device_id: string;
  trainee_qr_code: string;
  session_id: string;
  programme_id?: number;
  timestamp: string; // ISO string
  createdAt: number;
  status: 'OFFLINE_QUEUED';
}

const DB_NAME = 'ncct_attendance_offline_db';
const STORE_NAME = 'offline_attendance_queue';
const DB_VERSION = 1;

/**
 * Initializes and opens the IndexedDB database.
 */
export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('trainee_qr_code', 'trainee_qr_code', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Stores an unsynced attendance scan into IndexedDB.
 */
export async function addOfflineAttendance(
  record: Omit<OfflineAttendanceRecord, 'id' | 'createdAt' | 'status'>
): Promise<OfflineAttendanceRecord> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item: OfflineAttendanceRecord = {
      ...record,
      createdAt: Date.now(),
      status: 'OFFLINE_QUEUED',
    };
    const req = store.add(item);
    req.onsuccess = () => {
      item.id = req.result as number;
      resolve(item);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves all queued offline attendance scans.
 */
export async function getOfflineAttendanceQueue(): Promise<OfflineAttendanceRecord[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve offline attendance queue:', err);
    return [];
  }
}

/**
 * Removes successfully synced records by ID.
 */
export async function removeOfflineAttendance(ids: number[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    ids.forEach((id) => {
      store.delete(id);
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Empties the entire offline attendance queue.
 */
export async function clearOfflineAttendanceQueue(): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Returns count of currently queued offline records.
 */
export async function getOfflineAttendanceCount(): Promise<number> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}
