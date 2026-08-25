const WORKSPACE_MEDIA_BUCKET = 'workspace-media';
const WORKSPACE_MEDIA_PREFIX = 'supabase-media://';

const PERSONA_SINGLE_MEDIA_FIELDS = [
  'avatar',
  'referenceImage',
  'alternateReferenceImage',
] as const;

export class PersonaMediaPersistenceError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'PersonaMediaPersistenceError';
  }
}

function pathFromSignedWorkspaceUrl(value: string): string | null {
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

function isTemporaryMediaReference(value: string): boolean {
  const trimmed = value.trim();
  if (/^(?:blob:|file:|data:(?:image|audio|video)\/)/i.test(trimmed)) return true;
  if (/^(?:\/api)?\/uploads\//i.test(trimmed) || /^uploads\//i.test(trimmed)) return true;

  try {
    const url = new URL(trimmed);
    return /^(?:\/api)?\/uploads\//i.test(url.pathname);
  } catch {
    return false;
  }
}

function assertOwnedWorkspacePath(path: string, userId: string): void {
  if (!path.startsWith(`${userId}/`)) {
    throw new PersonaMediaPersistenceError('A persona can only use cloud media owned by this account.');
  }
}

export function normalizePersonaMediaReference(value: unknown, userId: string): unknown {
  if (typeof value !== 'string' || !value.trim()) return value;

  const signedPath = pathFromSignedWorkspaceUrl(value);
  if (signedPath) {
    assertOwnedWorkspacePath(signedPath, userId);
    return `${WORKSPACE_MEDIA_PREFIX}${signedPath}`;
  }

  if (value.startsWith(WORKSPACE_MEDIA_PREFIX)) {
    assertOwnedWorkspacePath(value.slice(WORKSPACE_MEDIA_PREFIX.length), userId);
    return value;
  }

  if (isTemporaryMediaReference(value)) {
    throw new PersonaMediaPersistenceError(
      'This photo is only temporary. Upload it again so it can be saved permanently before updating the persona.',
    );
  }

  return value;
}

export function normalizePersonaMediaReferences<T extends Record<string, any>>(body: T, userId: string): T {
  const normalized = { ...body };

  for (const field of PERSONA_SINGLE_MEDIA_FIELDS) {
    if (field in normalized) {
      normalized[field] = normalizePersonaMediaReference(normalized[field], userId);
    }
  }

  if ('additionalReferenceImages' in normalized) {
    if (!Array.isArray(normalized.additionalReferenceImages)) {
      throw new PersonaMediaPersistenceError('Additional reference photos must be a list of uploaded images.');
    }
    normalized.additionalReferenceImages = normalized.additionalReferenceImages.map((value: unknown) => {
      if (typeof value !== 'string') {
        throw new PersonaMediaPersistenceError('Every additional reference photo must be a valid uploaded image.');
      }
      return normalizePersonaMediaReference(value, userId);
    });
  }

  return normalized;
}
