const DB_NAME = 'AiInfluencerStudioPersonaDraftDB';
const DB_VERSION = 1;
const STORE_NAME = 'persona_drafts';
const REFERENCE_IMAGES_KEY = 'new_persona_reference_images';

interface PersonaReferenceImageDraft {
  id: typeof REFERENCE_IMAGES_KEY;
  images: string[];
  updatedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getPersonaDraftReferenceImages(): Promise<string[]> {
  const db = await openDB();

  try {
    return await new Promise<string[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(REFERENCE_IMAGES_KEY);
      request.onsuccess = () => {
        const draft = request.result as PersonaReferenceImageDraft | undefined;
        resolve(Array.isArray(draft?.images) ? draft.images : []);
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function savePersonaDraftReferenceImages(images: string[]): Promise<void> {
  const db = await openDB();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put({
        id: REFERENCE_IMAGES_KEY,
        images,
        updatedAt: new Date().toISOString(),
      } satisfies PersonaReferenceImageDraft);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function clearPersonaDraftReferenceImages(): Promise<void> {
  const db = await openDB();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(REFERENCE_IMAGES_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
