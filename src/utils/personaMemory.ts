import { accountLocalStorage } from './accountStorage';
import type { ConversationRecord } from './conversationContinuity';

export type PersonaMemorySource = 'automatic' | 'manual' | 'default';

export interface PersonaMemoryNote {
  id: string;
  text: string;
  pinned: boolean;
  source: PersonaMemorySource;
  createdAt: string;
  updatedAt: string;
}

const MAX_MEMORY_NOTES = 60;
const memoryKey = (personaId: string) => `persona_memories_${personaId}`;
const qualityMigrationKey = (personaId: string) => `persona_memories_quality_v2_${personaId}`;

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `memory-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function isCorruptedLegacyMemory(text: string): boolean {
  const normalized = text.toLowerCase();
  return normalized.includes('allowing is the')
    || normalized.includes("user's name is allowing")
    || normalized.includes("user's name is serious");
}

/**
 * Automatic memory is intentionally conservative. A transcript line is not a
 * fact merely because it contains "I want" or happens to be emotionally
 * charged. Only stable identity, relationship, household, preference, work,
 * location, or explicitly requested remember-statements are durable enough to
 * be injected into future calls.
 */
export function isDurablePersonaMemoryText(value: unknown): boolean {
  const text = normalizeText(value);
  if (!text || text.length > 320 || /\?$/.test(text)) return false;
  if (/^(?:and|but|so|yes|no|okay|ok|well|oh|um|uh|hmm|listen)\b/i.test(text)) return false;
  if (/\b(?:send|show|take|snap|generate|create|make|render|record|edit|change|remove|undress|strip)\b[\s\S]{0,80}\b(?:image|photo|picture|selfie|video|clip|clothes|nude|naked|topless)\b/i.test(text)) return false;

  return /^(?:my\s+name\s+is\b|call\s+me\b|i\s+(?:live\s+in|am\s+from|(?:work|study)\s+(?:as|at|in)|am\s+an?\b|have\s+(?:an?|one|two|three|four|five|\d+)\b|(?:love|like|prefer|hate|enjoy)\b)|my\s+(?:birthday|age|job|work|career|home|city|country|family|partner|wife|husband|girlfriend|boyfriend|child|children|son|daughter|brother|sister|parent|mother|father|goal|favorite|favourite|preference|pronouns?)\b|remember\s+that\b|you\s+have\s+(?:an?|one|two|three|four|five|\d+)\s+(?:older\s+|younger\s+)?(?:brother|sister|sibling|son|daughter|child|children)s?\b|your\s+(?:birthday|age|family|partner|child|children|son|daughter|brother|sister|parent|mother|father|favorite|favourite|preference|pronouns?)\b)/i.test(text);
}

function createNote(text: string, source: PersonaMemorySource): PersonaMemoryNote {
  const now = new Date().toISOString();
  return {
    id: createId(),
    text,
    pinned: source === 'default',
    source,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeNote(value: unknown): PersonaMemoryNote | null {
  if (!value || typeof value !== 'object') return null;
  const note = value as Partial<PersonaMemoryNote>;
  const text = normalizeText(note.text);
  if (!text || isCorruptedLegacyMemory(text)) return null;
  const now = new Date().toISOString();
  return {
    id: typeof note.id === 'string' && note.id ? note.id : createId(),
    text,
    pinned: Boolean(note.pinned),
    source: note.source === 'manual' || note.source === 'default' ? note.source : 'automatic',
    createdAt: typeof note.createdAt === 'string' ? note.createdAt : now,
    updatedAt: typeof note.updatedAt === 'string' ? note.updatedAt : now,
  };
}

function uniqueNotes(notes: PersonaMemoryNote[]): PersonaMemoryNote[] {
  const seen = new Set<string>();
  return notes.filter(note => {
    const key = note.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function savePersonaMemoryNotes(personaId: string, notes: PersonaMemoryNote[]): PersonaMemoryNote[] {
  const clean = uniqueNotes(notes.map(normalizeNote).filter((note): note is PersonaMemoryNote => Boolean(note)))
    .sort((left, right) => Number(right.pinned) - Number(left.pinned) || Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, MAX_MEMORY_NOTES);
  accountLocalStorage.setItem(memoryKey(personaId), JSON.stringify(clean));
  return clean;
}

/**
 * Reads the new editable memory format and migrates the legacy string array in
 * place. Default facts are seeded only on first load so deleting one remains a
 * durable "forget" action instead of it silently returning later.
 */
export function loadPersonaMemoryNotes(personaId: string, defaultFacts: string[] = []): PersonaMemoryNote[] {
  const raw = accountLocalStorage.getItem(memoryKey(personaId));
  if (!raw) {
    return savePersonaMemoryNotes(
      personaId,
      defaultFacts.map(text => normalizeText(text)).filter(Boolean).map(text => createNote(text, 'default')),
    );
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    if (parsed.every(item => typeof item === 'string')) {
      const legacy = parsed
        .map(text => normalizeText(text))
        .filter(text => text && !isCorruptedLegacyMemory(text))
        .map(text => createNote(text, 'automatic'));
      const existingText = new Set(legacy.map(note => note.text.toLowerCase()));
      const seededDefaults = defaultFacts
        .map(text => normalizeText(text))
        .filter(text => text && !existingText.has(text.toLowerCase()))
        .map(text => createNote(text, 'default'));
      const defaultsByText = new Map(defaultFacts.map(text => [normalizeText(text).toLowerCase(), normalizeText(text)]));
      const migrated = [...seededDefaults, ...legacy]
        .map(note => defaultsByText.has(note.text.toLowerCase())
          ? { ...note, source: 'default' as const, pinned: true }
          : note)
        .filter(note => note.source !== 'automatic' || isDurablePersonaMemoryText(note.text));
      accountLocalStorage.setItem(qualityMigrationKey(personaId), '1');
      return savePersonaMemoryNotes(personaId, migrated);
    }

    let notes = uniqueNotes(parsed.map(normalizeNote).filter((note): note is PersonaMemoryNote => Boolean(note)))
      .sort((left, right) => Number(right.pinned) - Number(left.pinned) || Date.parse(right.updatedAt) - Date.parse(left.updatedAt));

    // Repair the old object-format migration once. It marked seeded defaults as
    // ordinary chat memories and retained one-off wishes as permanent facts.
    if (accountLocalStorage.getItem(qualityMigrationKey(personaId)) !== '1') {
      const defaults = new Set(defaultFacts.map(text => normalizeText(text).toLowerCase()).filter(Boolean));
      notes = notes
        .map(note => defaults.has(note.text.toLowerCase())
          ? { ...note, source: 'default' as const, pinned: true }
          : note)
        .filter(note => note.source !== 'automatic' || isDurablePersonaMemoryText(note.text));
      accountLocalStorage.setItem(qualityMigrationKey(personaId), '1');
      return savePersonaMemoryNotes(personaId, notes);
    }

    return notes;
  } catch {
    return [];
  }
}

export function addPersonaMemoryNote(
  personaId: string,
  text: string,
  source: PersonaMemorySource = 'manual',
  defaultFacts: string[] = [],
): PersonaMemoryNote[] {
  const cleanText = normalizeText(text);
  const existing = loadPersonaMemoryNotes(personaId, defaultFacts);
  if (!cleanText || existing.some(note => note.text.toLowerCase() === cleanText.toLowerCase())) return existing;
  return savePersonaMemoryNotes(personaId, [createNote(cleanText, source), ...existing]);
}

export function updatePersonaMemoryNote(personaId: string, noteId: string, text: string): PersonaMemoryNote[] {
  const cleanText = normalizeText(text);
  if (!cleanText) return loadPersonaMemoryNotes(personaId);
  const now = new Date().toISOString();
  return savePersonaMemoryNotes(personaId, loadPersonaMemoryNotes(personaId).map(note => (
    note.id === noteId ? { ...note, text: cleanText, updatedAt: now, source: 'manual' as const } : note
  )));
}

export function togglePersonaMemoryPinned(personaId: string, noteId: string): PersonaMemoryNote[] {
  const now = new Date().toISOString();
  return savePersonaMemoryNotes(personaId, loadPersonaMemoryNotes(personaId).map(note => (
    note.id === noteId ? { ...note, pinned: !note.pinned, updatedAt: now } : note
  )));
}

export function deletePersonaMemoryNote(personaId: string, noteId: string): PersonaMemoryNote[] {
  return savePersonaMemoryNotes(personaId, loadPersonaMemoryNotes(personaId).filter(note => note.id !== noteId));
}

function truncate(text: string, maxLength = 150): string {
  const clean = normalizeText(text);
  return clean.length <= maxLength ? clean : `${clean.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildRecentConversationSummary(records: ConversationRecord[], personaName: string): string {
  const conversational = records.filter(record => record.type === 'text' && normalizeText(record.content));
  if (conversational.length === 0) return 'No conversation has been saved yet.';

  const latestUser = [...conversational].reverse().find(record => record.role === 'user');
  const latestPersona = [...conversational].reverse().find(record => record.role === 'persona');
  const recentSources = new Set(conversational.slice(-12).map(record => record.source || 'text'));
  const sourceLabel = recentSources.has('voice') && recentSources.has('text')
    ? 'Recent text and voice context'
    : recentSources.has('voice')
      ? 'Latest voice-call context'
      : 'Latest text-chat context';

  const parts = [sourceLabel];
  if (latestUser) parts.push(`You said “${truncate(latestUser.content)}”`);
  if (latestPersona) parts.push(`${personaName} replied “${truncate(latestPersona.content)}”`);
  return `${parts.join('. ')}.`;
}
