import nodeCrypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const isLocalFileStorageEnabled = () =>
  process.env.NODE_ENV !== 'production' && process.env.ALLOW_LOCAL_FILE_STORAGE === 'true';

export function localUserSegment(userId: string): string {
  return nodeCrypto.createHash('sha256').update(userId).digest('hex').slice(0, 24);
}

function getLocalUserDirectory(userId: string): string {
  return path.join(process.cwd(), 'server', '.local-data', localUserSegment(userId));
}

function getLocalStorePath(userId: string, storeName: 'personas' | 'creator-profile'): string {
  return path.join(getLocalUserDirectory(userId), `${storeName}.json`);
}

export function readLocalStore<T>(userId: string, storeName: 'personas' | 'creator-profile', fallback: T): T {
  if (!isLocalFileStorageEnabled() || !userId) return fallback;
  try {
    const filePath = getLocalStorePath(userId, storeName);
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch (error) {
    console.warn(`[Local Store] Failed to read ${storeName}:`, error instanceof Error ? error.message : error);
    return fallback;
  }
}

export function writeLocalStore<T>(userId: string, storeName: 'personas' | 'creator-profile', value: T): void {
  if (!isLocalFileStorageEnabled() || !userId) return;
  try {
    const directory = getLocalUserDirectory(userId);
    fs.mkdirSync(directory, { recursive: true });
    const filePath = getLocalStorePath(userId, storeName);
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    console.warn(`[Local Store] Failed to write ${storeName}:`, error instanceof Error ? error.message : error);
  }
}
