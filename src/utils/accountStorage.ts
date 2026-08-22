const ACCOUNT_STORAGE_VERSION = 'v1';
const SYNC_META_BASE = '__workspace_sync_meta__';
const MAX_REMOTE_VALUE_BYTES = 1_500_000;
const REMOTE_WRITE_DEBOUNCE_MS = 450;

const SYNCABLE_EXACT_KEYS = new Set([
  'ai_studio_creator_profile',
  'persona_user_name',
  'persona_form_draft',
  'gallery_favorites',
  'ai_influencer_gallery',
  'ai_tools_saved_prompts',
  'ai_toolbox_garment_desc',
  'ai_toolbox_tryon_mode',
  'ai_influencer_draft_prompt',
  'ai_influencer_draft_video_prompt',
  'ai_influencer_feed_history',
  'agent_presets',
  'agent_default_voice_id',
  'superagent_cloned_voice',
  'superagent_cloned_voice_id',
  'superagent_my_voices',
]);

const SYNCABLE_KEY_PREFIXES = [
  'chat_history_',
  'persona_memories_',
  'persona_relationship_',
  'vox_vault_',
  'connected_accounts_',
  'planner_schedules_',
];

interface WorkspaceStateEntry {
  key: string;
  value: string;
  updatedAt: string;
}

interface WorkspaceSyncAdapter {
  list: () => Promise<WorkspaceStateEntry[]>;
  save: (key: string, value: string) => Promise<WorkspaceStateEntry>;
  remove: (key: string) => Promise<unknown>;
}

interface SyncMarker {
  updatedAt: string;
  deleted?: boolean;
}

type SyncMeta = Record<string, SyncMarker>;

let activeStorageUserId: string | null = null;
let workspaceSyncAdapter: WorkspaceSyncAdapter | null = null;
const pendingRemoteChanges = new Map<string, ReturnType<typeof setTimeout>>();

export function configureAccountStorageSync(adapter: WorkspaceSyncAdapter) {
  workspaceSyncAdapter = adapter;
}

export function setActiveStorageUserId(userId: string | null | undefined) {
  const nextUserId = typeof userId === 'string' && userId.length > 0 ? userId : null;
  if (nextUserId !== activeStorageUserId) {
    pendingRemoteChanges.forEach(timer => clearTimeout(timer));
    pendingRemoteChanges.clear();
  }
  activeStorageUserId = nextUserId;
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

function isSyncableWorkspaceKey(base: string): boolean {
  return SYNCABLE_EXACT_KEYS.has(base)
    || SYNCABLE_KEY_PREFIXES.some(prefix => base.startsWith(prefix));
}

function canSyncWorkspaceValue(base: string, value: string): boolean {
  if (!isSyncableWorkspaceKey(base) || new TextEncoder().encode(value).byteLength > MAX_REMOTE_VALUE_BYTES) return false;
  return !/data:(?:image|audio|video)\//i.test(value);
}

function getSyncMetaKey(userId: string): string {
  return accountStorageKey(SYNC_META_BASE, userId);
}

function readSyncMeta(userId: string): SyncMeta {
  try {
    const raw = localStorage.getItem(getSyncMetaKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSyncMeta(userId: string, meta: SyncMeta) {
  try {
    localStorage.setItem(getSyncMetaKey(userId), JSON.stringify(meta));
  } catch {}
}

function markLocalChange(base: string, userId: string, deleted = false, updatedAt = new Date().toISOString()) {
  const meta = readSyncMeta(userId);
  meta[base] = { updatedAt, ...(deleted ? { deleted: true } : {}) };
  writeSyncMeta(userId, meta);
}

function scheduleRemoteSave(base: string, value: string, userId: string) {
  if (!workspaceSyncAdapter || !canSyncWorkspaceValue(base, value)) return;
  const queueKey = `${userId}:${base}`;
  const existingTimer = pendingRemoteChanges.get(queueKey);
  if (existingTimer) clearTimeout(existingTimer);

  pendingRemoteChanges.set(queueKey, setTimeout(() => {
    pendingRemoteChanges.delete(queueKey);
    if (!workspaceSyncAdapter || activeStorageUserId !== userId) return;
    void workspaceSyncAdapter.save(base, value)
      .then(entry => {
        if (activeStorageUserId === userId && localStorage.getItem(accountStorageKey(base, userId)) === value) {
          markLocalChange(base, userId, false, entry.updatedAt);
        }
      })
      .catch(error => console.warn(`[Workspace Sync] Could not save ${base}:`, error));
  }, REMOTE_WRITE_DEBOUNCE_MS));
}

function scheduleRemoteRemove(base: string, userId: string) {
  if (!workspaceSyncAdapter || !isSyncableWorkspaceKey(base)) return;
  const queueKey = `${userId}:${base}`;
  const existingTimer = pendingRemoteChanges.get(queueKey);
  if (existingTimer) clearTimeout(existingTimer);

  pendingRemoteChanges.set(queueKey, setTimeout(() => {
    pendingRemoteChanges.delete(queueKey);
    if (!workspaceSyncAdapter || activeStorageUserId !== userId) return;
    void workspaceSyncAdapter.remove(base)
      .catch(error => console.warn(`[Workspace Sync] Could not delete ${base}:`, error));
  }, REMOTE_WRITE_DEBOUNCE_MS));
}

function setAccountLocalValue(base: string, value: string, userId: string) {
  localStorage.setItem(accountStorageKey(base, userId), value);
  markLocalChange(base, userId);
  if (activeStorageUserId === userId) scheduleRemoteSave(base, value, userId);
}

function createAccountStorage(storage: Storage, syncRemote: boolean) {
  return {
    getItem(base: string): string | null {
      const key = resolveAccountKey(base);
      return key ? storage.getItem(key) : null;
    },
    setItem(base: string, value: string): void {
      const userId = activeStorageUserId;
      if (!userId) return;
      const key = accountStorageKey(base, userId);
      storage.setItem(key, value);
      if (syncRemote) {
        markLocalChange(base, userId);
        scheduleRemoteSave(base, value, userId);
      }
    },
    removeItem(base: string): void {
      const userId = activeStorageUserId;
      if (!userId) return;
      const key = accountStorageKey(base, userId);
      storage.removeItem(key);
      if (syncRemote) {
        markLocalChange(base, userId, true);
        scheduleRemoteRemove(base, userId);
      }
    },
  };
}

export const accountLocalStorage = createAccountStorage(localStorage, true);
export const accountSessionStorage = createAccountStorage(sessionStorage, false);

function listAccountLocalValues(userId: string): Map<string, string> {
  const suffix = `:${ACCOUNT_STORAGE_VERSION}:${userId}`;
  const values = new Map<string, string>();
  for (let index = 0; index < localStorage.length; index += 1) {
    const fullKey = localStorage.key(index);
    if (!fullKey?.endsWith(suffix)) continue;
    const base = fullKey.slice(0, -suffix.length);
    if (base === SYNC_META_BASE || !isSyncableWorkspaceKey(base)) continue;
    const value = localStorage.getItem(fullKey);
    if (value !== null) values.set(base, value);
  }
  return values;
}

export async function hydrateAccountLocalStorage(userId: string): Promise<void> {
  if (!workspaceSyncAdapter || activeStorageUserId !== userId) return;

  const remoteEntries = await workspaceSyncAdapter.list();
  if (activeStorageUserId !== userId) return;

  const remoteByKey = new Map(remoteEntries.map(entry => [entry.key, entry]));
  const localValues = listAccountLocalValues(userId);
  const meta = readSyncMeta(userId);
  const operations: Promise<unknown>[] = [];

  for (const entry of remoteEntries) {
    if (!isSyncableWorkspaceKey(entry.key)) continue;
    const localValue = localValues.get(entry.key);
    const marker = meta[entry.key];
    const localUpdatedAt = marker ? Date.parse(marker.updatedAt) : 0;
    const remoteUpdatedAt = Date.parse(entry.updatedAt) || 0;

    if (marker?.deleted && localUpdatedAt > remoteUpdatedAt) {
      operations.push(workspaceSyncAdapter.remove(entry.key));
      continue;
    }

    if (localValue !== undefined && localUpdatedAt > remoteUpdatedAt) {
      if (canSyncWorkspaceValue(entry.key, localValue)) {
        operations.push(workspaceSyncAdapter.save(entry.key, localValue).then(saved => {
          meta[entry.key] = { updatedAt: saved.updatedAt };
        }));
      }
      continue;
    }

    localStorage.setItem(accountStorageKey(entry.key, userId), entry.value);
    meta[entry.key] = { updatedAt: entry.updatedAt };
  }

  for (const [base, value] of localValues) {
    if (remoteByKey.has(base) || meta[base]?.deleted || !canSyncWorkspaceValue(base, value)) continue;
    operations.push(workspaceSyncAdapter.save(base, value).then(saved => {
      meta[base] = { updatedAt: saved.updatedAt };
    }));
  }

  await Promise.allSettled(operations);
  if (activeStorageUserId === userId) writeSyncMeta(userId, meta);
}

export function migrateLegacyAccountKey(base: string, userId: string): void {
  const scopedKey = accountStorageKey(base, userId);
  if (localStorage.getItem(scopedKey) !== null) return;
  const legacyValue = localStorage.getItem(base);
  if (legacyValue !== null) setAccountLocalValue(base, legacyValue, userId);
}
