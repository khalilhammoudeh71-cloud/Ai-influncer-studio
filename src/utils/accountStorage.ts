const ACCOUNT_STORAGE_VERSION = 'v1';

let activeStorageUserId: string | null = null;

export function setActiveStorageUserId(userId: string | null | undefined) {
  activeStorageUserId = typeof userId === 'string' && userId.length > 0 ? userId : null;
}

export function getActiveStorageUserId(): string | null {
  return activeStorageUserId;
}

export function accountStorageKey(base: string, userId: string): string {
  return `${base}:${ACCOUNT_STORAGE_VERSION}:${userId}`;
}

function resolveAccountKey(base: string): string | null {
  return activeStorageUserId ? accountStorageKey(base, activeStorageUserId) : null;
}

function createAccountStorage(storage: Storage) {
  return {
    getItem(base: string): string | null {
      const key = resolveAccountKey(base);
      return key ? storage.getItem(key) : null;
    },
    setItem(base: string, value: string): void {
      const key = resolveAccountKey(base);
      if (key) storage.setItem(key, value);
    },
    removeItem(base: string): void {
      const key = resolveAccountKey(base);
      if (key) storage.removeItem(key);
    },
  };
}

export const accountLocalStorage = createAccountStorage(localStorage);
export const accountSessionStorage = createAccountStorage(sessionStorage);

export function migrateLegacyAccountKey(base: string, userId: string): void {
  const scopedKey = accountStorageKey(base, userId);
  if (localStorage.getItem(scopedKey) !== null) return;
  const legacyValue = localStorage.getItem(base);
  if (legacyValue !== null) localStorage.setItem(scopedKey, legacyValue);
}
