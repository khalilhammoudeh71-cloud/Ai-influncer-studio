import { accountLocalStorage, getActiveStorageUserId } from './accountStorage';

export interface SavedVoiceItem {
  id: string;
  name: string;
  description: string;
  model: string;
  audioRef: string;
  sampleAudioUrl?: string;
  dateCreated: string;
  settings: {
    stability: number;
    similarityBoost: number;
    styleExaggeration: number;
    speechSpeed: number;
  };
}

interface StoredVoiceItem extends SavedVoiceItem {
  ownerId: string;
  storageId: string;
}

const DB_NAME = 'AiInfluencerStudioDB';
const DB_VERSION = 2;
const STORE_NAME = 'my_voices_v2';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'storageId' });
      }
    };
    request.onsuccess = (event: any) => resolve(event.target.result);
    request.onerror = (event: any) => reject(event.target.error);
  });
}

export async function getAllSavedVoices(): Promise<SavedVoiceItem[]> {
  const ownerId = getActiveStorageUserId();
  if (!ownerId) return [];
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items: SavedVoiceItem[] = ((req.result as StoredVoiceItem[]) || [])
          .filter(item => item.ownerId === ownerId)
          .map(({ ownerId: _ownerId, storageId: _storageId, ...item }) => item);
        const legacy = getLocalStorageFallback();
        const mergedMap = new Map<string, SavedVoiceItem>();
        legacy.forEach(item => mergedMap.set(item.id, item));
        items.forEach(item => mergedMap.set(item.id, item));
        const mergedList = Array.from(mergedMap.values());
        mergedList.sort((a, b) => (b.id > a.id ? 1 : -1));
        resolve(mergedList);
      };
      req.onerror = () => resolve(getLocalStorageFallback());
    });
  } catch (e) {
    return getLocalStorageFallback();
  }
}

export async function saveVoiceItem(item: SavedVoiceItem): Promise<SavedVoiceItem[]> {
  const ownerId = getActiveStorageUserId();
  if (!ownerId) return [];
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const storedItem: StoredVoiceItem = {
        ...item,
        ownerId,
        storageId: `${ownerId}:${item.id}`,
      };
      const req = store.put(storedItem);
      req.onsuccess = () => resolve();
      req.onerror = (e: any) => reject(e.target.error);
    });
  } catch (e) {
    console.warn('[IndexedDB Save Note, fallback to localStorage]:', e);
    saveLocalStorageFallback(item);
  }
  return getAllSavedVoices();
}

export async function deleteVoiceItem(id: string): Promise<SavedVoiceItem[]> {
  const ownerId = getActiveStorageUserId();
  if (!ownerId) return [];
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(`${ownerId}:${id}`);
      req.onsuccess = () => resolve();
      req.onerror = (e: any) => reject(e.target.error);
    });
  } catch (e) {
    console.warn('[IndexedDB Delete Note]:', e);
  }
  deleteLocalStorageFallback(id);
  return getAllSavedVoices();
}

function getLocalStorageFallback(): SavedVoiceItem[] {
  try {
    const raw = accountLocalStorage.getItem('superagent_my_voices');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalStorageFallback(item: SavedVoiceItem) {
  try {
    const existing = getLocalStorageFallback();
    const filtered = existing.filter(v => v.id !== item.id);
    const updated = [item, ...filtered];
    accountLocalStorage.setItem('superagent_my_voices', JSON.stringify(updated));
  } catch (e) {
    console.warn('[LocalStorage Full]:', e);
  }
}

function deleteLocalStorageFallback(id: string) {
  try {
    const existing = getLocalStorageFallback();
    const updated = existing.filter(v => v.id !== id);
    accountLocalStorage.setItem('superagent_my_voices', JSON.stringify(updated));
  } catch (e) {}
}
