import { supabase } from '../lib/supabase';

const WORKSPACE_MEDIA_BUCKET = 'workspace-media';
const STORAGE_REFERENCE_PREFIX = 'supabase-media://';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

const MIME_EXTENSIONS: Record<string, string> = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
  'audio/m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

const DATA_MEDIA_PATTERN = /^data:((?:image|audio|video)\/[a-zA-Z0-9.+-]+);base64,(.+)$/s;

function storageReference(path: string): string {
  return `${STORAGE_REFERENCE_PREFIX}${path}`;
}

function storagePathFromReference(value: string): string | null {
  return value.startsWith(STORAGE_REFERENCE_PREFIX)
    ? value.slice(STORAGE_REFERENCE_PREFIX.length)
    : null;
}

export function isWorkspaceMediaReference(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith(STORAGE_REFERENCE_PREFIX);
}

export function isTemporaryBrowserMedia(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith('blob:');
}

function storagePathFromSignedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const prefix = `/storage/v1/object/sign/${WORKSPACE_MEDIA_BUCKET}/`;
    const index = url.pathname.indexOf(prefix);
    if (index < 0) return null;
    return decodeURIComponent(url.pathname.slice(index + prefix.length));
  } catch {
    return null;
  }
}

function dataUrlToBlob(value: string): { blob: Blob; contentType: string; mediaType: string } {
  const match = value.match(DATA_MEDIA_PATTERN);
  if (!match) throw new Error('Unsupported uploaded media format');

  const contentType = match[1].toLowerCase();
  const binary = window.atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);

  return {
    blob: new Blob([bytes], { type: contentType }),
    contentType,
    mediaType: contentType.split('/')[0],
  };
}

async function sha256(value: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await value.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function requireCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Please sign in again before uploading media');
  return data.user.id;
}

async function uploadDataMedia(value: string): Promise<string> {
  const { blob, contentType, mediaType } = dataUrlToBlob(value);
  const userId = await requireCurrentUserId();
  const extension = MIME_EXTENSIONS[contentType] || contentType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'bin';
  const digest = await sha256(blob);
  const objectPath = `${userId}/${mediaType}/${digest}.${extension}`;

  const { error } = await supabase.storage
    .from(WORKSPACE_MEDIA_BUCKET)
    .upload(objectPath, blob, {
      cacheControl: '31536000',
      contentType,
      upsert: true,
    });

  if (error) throw new Error(`Could not securely upload ${mediaType}: ${error.message}`);
  return storageReference(objectPath);
}

async function prepareMediaString(value: string): Promise<string> {
  const existingPath = storagePathFromReference(value) || storagePathFromSignedUrl(value);
  if (existingPath) return storageReference(existingPath);
  return DATA_MEDIA_PATTERN.test(value) ? uploadDataMedia(value) : value;
}

async function resolveMediaString(value: string): Promise<string> {
  const path = storagePathFromReference(value);
  if (!path) return value;

  const { data, error } = await supabase.storage
    .from(WORKSPACE_MEDIA_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) throw new Error(`Could not securely open uploaded media: ${error?.message || 'Unknown error'}`);
  return data.signedUrl;
}

async function resolveMediaStringSafely(value: string): Promise<string> {
  try {
    return await resolveMediaString(value);
  } catch (error) {
    // Keep one missing or inaccessible object from preventing every other image
    // in the same persona/workspace payload from receiving a fresh signed URL.
    console.warn('[Workspace Media] One saved media item could not be opened:', error);
    return value;
  }
}

async function transformMediaDeep(value: unknown, transform: (value: string) => Promise<string>): Promise<unknown> {
  if (typeof value === 'string') return transform(value);
  if (Array.isArray(value)) return Promise.all(value.map(item => transformMediaDeep(item, transform)));
  if (value && typeof value === 'object') {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, item]) => [key, await transformMediaDeep(item, transform)] as const),
    );
    return Object.fromEntries(entries);
  }
  return value;
}

async function transformSerializedValue(value: string, transform: (value: string) => Promise<string>): Promise<string> {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') return JSON.stringify(await transformMediaDeep(parsed, transform));
  } catch {}
  return transform(value);
}

export function prepareWorkspaceValueForStorage(value: string): Promise<string> {
  return transformSerializedValue(value, prepareMediaString);
}

export function resolveWorkspaceValueFromStorage(value: string): Promise<string> {
  return transformSerializedValue(value, resolveMediaStringSafely);
}

export async function preparePersonaMediaForStorage<T>(persona: T): Promise<T> {
  return await transformMediaDeep(persona, prepareMediaString) as T;
}

export async function resolvePersonaMediaFromStorage<T>(persona: T): Promise<T> {
  return await transformMediaDeep(persona, resolveMediaStringSafely) as T;
}

export async function persistMediaStringsForPlayback(values: string[]): Promise<string[]> {
  const stored = await Promise.all(values.map(prepareMediaString));
  return Promise.all(stored.map(resolveMediaString));
}
