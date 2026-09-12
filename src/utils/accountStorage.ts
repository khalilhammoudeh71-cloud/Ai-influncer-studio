const ACCOUNT_STORAGE_VERSION = 'v1';
const SYNC_META_BASE = '__workspace_sync_meta__';
const MAX_REMOTE_VALUE_BYTES = 1_500_000;
const REMOTE_WRITE_DEBOUNCE_MS = 450;

const SYNCABLE_EXACT_KEYS = new Set([
  'ai_studio_creator_profile',
  'persona_user_name',
  'persona_form_draft',
  'persona_draft_reference_images',
  'gallery_favorites',
  'ai_influencer_gallery',
  'ai_tools_saved_prompts',
  'ai_toolbox_garment_desc',
  'ai_toolbox_tryon_mode',
  'ai_toolbox_source_image',
  'ai_toolbox_result_image',
  'ai_toolbox_result_history',
  'ai_toolbox_garment_image',
  'ai_toolbox_garment_images',
  'ai_toolbox_face_image',
  'ai_influencer_draft_prompt',
  'ai_influencer_draft_video_prompt',
  'ai_influencer_feed_history',
  'agent_presets',
  'super_agent_brief',
  'agent_default_voice_id',
  'superagent_cloned_voice',
  'superagent_cloned_voice_id',
  'superagent_cloned_voice_audio',
  'superagent_my_voices',
  'voice_accuracy_profile',
  'voice_identity_profile',
]);

const SYNCABLE_KEY_PREFIXES = [
  'chat_history_',
  'chat_archive_',
  'persona_memories_',
  'persona_relationship_',
  'vox_vault_',
  'connected_accounts_',
  'planner_schedules_',
  'planner_social_handles_',
  'planner_pending_asset_',
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
  prepareForRemote?: (value: string) => Promise<string>;
  prepareForLocal?: (value: string) => Promise<string>;
}

interface SyncMarker {
  updatedAt: string;
  deleted?: boolean;
  dirty?: boolean;
}

type SyncMeta = Record<string, SyncMarker>;

let activeStorageUserId: string | null = null;
let workspaceSyncAdapter: WorkspaceSyncAdapter | null = null;
const pendingRemoteChanges = new Map<string, ReturnType<typeof setTimeout>>();
const outstandingSyncKeys = new Set<string>();

export type WorkspaceSyncStatus = 'synced' | 'syncing' | 'pending';

function notifyWorkspaceSync(status: WorkspaceSyncStatus, key?: string, error?: unknown) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('workspace-sync-status', {
    detail: {
      status,
      key,
      message: error instanceof Error ? error.message : error ? String(error) : undefined,
    },
  }));
}

export function configureAccountStorageSync(adapter: WorkspaceSyncAdapter) {
  workspaceSyncAdapter = adapter;
}

export function setActiveStorageUserId(userId: string | null | undefined) {
  const nextUserId = typeof userId === 'string' && userId.length > 0 ? userId : null;
  if (nextUserId !== activeStorageUserId) {
    pendingRemoteChanges.forEach(timer => clearTimeout(timer));
    pendingRemoteChanges.clear();
    outstandingSyncKeys.clear();
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
  return isSyncableWorkspaceKey(base) && new TextEncoder().encode(value).byteLength <= MAX_REMOTE_VALUE_BYTES;
}

function isSyncableWorkspaceKeyOnly(base: string): boolean {
  return isSyncableWorkspaceKey(base);
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

function markLocalChange(base: string, userId: string, deleted = false, updatedAt = new Date().toISOString(), dirty = true) {
  const meta = readSyncMeta(userId);
  meta[base] = { updatedAt, dirty, ...(deleted ? { deleted: true } : {}) };
  writeSyncMeta(userId, meta);
}

function scheduleRemoteSave(
  base: string,
  value: string,
  userId: string,
  delayMs = REMOTE_WRITE_DEBOUNCE_MS,
  attempt = 0,
) {
  if (!workspaceSyncAdapter || !isSyncableWorkspaceKeyOnly(base)) return;
  const queueKey = `${userId}:${base}`;
  outstandingSyncKeys.add(queueKey);
  const existingTimer = pendingRemoteChanges.get(queueKey);
  if (existingTimer) clearTimeout(existingTimer);

  pendingRemoteChanges.set(queueKey, setTimeout(() => {
    pendingRemoteChanges.delete(queueKey);
    if (!workspaceSyncAdapter || activeStorageUserId !== userId) return;
    notifyWorkspaceSync('syncing', base);
    void Promise.resolve(workspaceSyncAdapter.prepareForRemote?.(value) ?? value)
      .then(preparedValue => {
        if (!canSyncWorkspaceValue(base, preparedValue)) throw new Error('Workspace value remains too large after media upload');
        return workspaceSyncAdapter!.save(base, preparedValue);
      })
      .then(entry => {
        if (activeStorageUserId === userId && localStorage.getItem(accountStorageKey(base, userId)) === value) {
          markLocalChange(base, userId, false, entry.updatedAt, false);
          outstandingSyncKeys.delete(queueKey);
          notifyWorkspaceSync(outstandingSyncKeys.size === 0 ? 'synced' : 'pending', base);
        } else if (activeStorageUserId === userId) {
          // An older upload finished after a newer edit; restore the newest value remotely.
          const latest = localStorage.getItem(accountStorageKey(base, userId));
          markLocalChange(base, userId, latest === null);
          if (latest === null) scheduleRemoteRemove(base, userId);
          else scheduleRemoteSave(base, latest, userId);
        }
      })
      .catch(error => {
        notifyWorkspaceSync('pending', base, error);
        const stillCurrent = activeStorageUserId === userId
          && localStorage.getItem(accountStorageKey(base, userId)) === value;
        if (stillCurrent) {
          const retryDelay = Math.min(60_000, 1_000 * (2 ** Math.min(attempt, 6)));
          scheduleRemoteSave(base, value, userId, retryDelay, attempt + 1);
        }
      });
  }, delayMs));
}

function scheduleRemoteRemove(base: string, userId: string, delayMs = REMOTE_WRITE_DEBOUNCE_MS, attempt = 0) {
  if (!workspaceSyncAdapter || !isSyncableWorkspaceKey(base)) return;
  const queueKey = `${userId}:${base}`;
  outstandingSyncKeys.add(queueKey);
  const existingTimer = pendingRemoteChanges.get(queueKey);
  if (existingTimer) clearTimeout(existingTimer);

  pendingRemoteChanges.set(queueKey, setTimeout(() => {
    pendingRemoteChanges.delete(queueKey);
    if (!workspaceSyncAdapter || activeStorageUserId !== userId) return;
    notifyWorkspaceSync('syncing', base);
    void workspaceSyncAdapter.remove(base)
      .then(() => {
        if (activeStorageUserId !== userId) return;
        const latest = localStorage.getItem(accountStorageKey(base, userId));
        if (latest !== null) { markLocalChange(base, userId); scheduleRemoteSave(base, latest, userId); return; }
        markLocalChange(base, userId, true, new Date().toISOString(), false);
        outstandingSyncKeys.delete(queueKey);
        notifyWorkspaceSync(outstandingSyncKeys.size === 0 ? 'synced' : 'pending', base);
      })
      .catch(error => {
        notifyWorkspaceSync('pending', base, error);
        const stillDeleted = activeStorageUserId === userId
          && localStorage.getItem(accountStorageKey(base, userId)) === null;
        if (stillDeleted) {
          const retryDelay = Math.min(60_000, 1_000 * (2 ** Math.min(attempt, 6)));
          scheduleRemoteRemove(base, userId, retryDelay, attempt + 1);
        }
      });
  }, delayMs));
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
  const adapter = workspaceSyncAdapter;
  const remoteEntries = await adapter.list();
  if (activeStorageUserId !== userId) return;
  const remoteByKey = new Map(remoteEntries.map(entry => [entry.key, entry]));
  const localValues = listAccountLocalValues(userId);
  const meta = readSyncMeta(userId);
  const operations: Promise<unknown>[] = [];
  const upload = async (base: string, value: string) => {
    const prepared = await (adapter.prepareForRemote?.(value) ?? value);
    if (activeStorageUserId !== userId || localStorage.getItem(accountStorageKey(base, userId)) !== value) return;
    if (!canSyncWorkspaceValue(base, prepared)) throw new Error('Workspace value remains too large after media upload');
    const saved = await adapter.save(base, prepared);
    if (activeStorageUserId !== userId) return;
    const latest = localStorage.getItem(accountStorageKey(base, userId));
    if (latest === value) markLocalChange(base, userId, false, saved.updatedAt, false);
    else {
      markLocalChange(base, userId, latest === null);
      if (latest === null) scheduleRemoteRemove(base, userId);
      else scheduleRemoteSave(base, latest, userId);
    }
  };
  for (const entry of remoteEntries) {
    if (!isSyncableWorkspaceKey(entry.key)) continue;
    const localValue = localValues.get(entry.key);
    const marker = meta[entry.key];
    const localUpdatedAt = marker ? Date.parse(marker.updatedAt) : 0;
    const remoteUpdatedAt = Date.parse(entry.updatedAt) || 0;
    if (marker?.deleted && (marker.dirty || localUpdatedAt > remoteUpdatedAt)) {
      scheduleRemoteRemove(entry.key, userId);
      continue;
    }
    if (localValue !== undefined && (marker?.dirty || localUpdatedAt > remoteUpdatedAt)) {
      operations.push(upload(entry.key, localValue));
      continue;
    }
    operations.push(Promise.resolve(adapter.prepareForLocal?.(entry.value) ?? entry.value).then(value => {
      if (activeStorageUserId !== userId) return;
      // Media hydration may take time. Never replace writes made since it started.
      if (localStorage.getItem(accountStorageKey(entry.key, userId)) !== (localValue ?? null)) return;
      localStorage.setItem(accountStorageKey(entry.key, userId), value);
      markLocalChange(entry.key, userId, false, entry.updatedAt, false);
    }));
  }
  for (const [base, value] of localValues) {
    if (remoteByKey.has(base) || meta[base]?.deleted || !isSyncableWorkspaceKeyOnly(base)) continue;
    operations.push(upload(base, value));
  }
  await Promise.allSettled(operations);
}

export function migrateLegacyAccountKey(base: string, userId: string): void {
  const scopedKey = accountStorageKey(base, userId);
  if (localStorage.getItem(scopedKey) !== null) return;
  const legacyValue = localStorage.getItem(base);
  if (legacyValue !== null) setAccountLocalValue(base, legacyValue, userId);
}
