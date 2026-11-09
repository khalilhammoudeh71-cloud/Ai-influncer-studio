const RETRY_KEY = 'studio-dynamic-import-retry';
const RETRY_COOLDOWN_MS = 60_000;
type RetryStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function isChunkLoadError(error: Error): boolean {
  return /dynamically imported module|importing a module script failed|chunk[\s-]*load|loading chunk .+ failed/i.test(error.message);
}

/** Bound automatic refreshes, but allow recovery from a later deployment. */
export function claimChunkReload(getStorage: () => RetryStorage, now = Date.now()): boolean {
  try {
    const storage = getStorage();
    const last = Number(storage.getItem(RETRY_KEY));
    if (Number.isFinite(last) && last > 0 && now - last < RETRY_COOLDOWN_MS) return false;
    storage.setItem(RETRY_KEY, String(now));
    return true;
  } catch {
    // Manual recovery still works when browser storage is unavailable.
    return false;
  }
}

export function freshStudioUrl(current: string, now = Date.now()): string {
  const url = new URL(current);
  url.searchParams.set('studio-reload', String(now));
  return url.toString();
}
