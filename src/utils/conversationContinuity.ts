import { accountLocalStorage } from './accountStorage';

export interface ConversationRecord {
  id: string;
  role: 'user' | 'persona';
  type: string;
  content: string;
  timestamp: Date | string;
  prompt?: string;
  source?: 'voice' | 'text' | 'system';
  [key: string]: unknown;
}

interface ArchiveIndex {
  chunks: number;
  totalMessages: number;
  updatedAt: string;
}

const RECENT_LIMIT = 300;
const ARCHIVE_CHUNK_SIZE = 150;
const historyKey = (personaId: string) => `chat_history_${personaId}`;
const archiveIndexKey = (personaId: string) => `chat_archive_index_${personaId}`;
const archiveChunkKey = (personaId: string, chunk: number) => `chat_archive_${personaId}_${chunk}`;

const MEMORY_STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'and', 'are', 'because', 'been', 'before', 'but', 'can', 'could',
  'did', 'does', 'for', 'from', 'had', 'has', 'have', 'her', 'here', 'him', 'his', 'how', 'into', 'just',
  'like', 'more', 'not', 'now', 'our', 'out', 'said', 'say', 'she', 'should', 'some', 'that', 'the', 'their',
  'them', 'then', 'there', 'they', 'this', 'through', 'too', 'was', 'were', 'what', 'when', 'where', 'which',
  'who', 'why', 'will', 'with', 'would', 'you', 'your', 'yours',
]);

function parseRecords(raw: string | null): ConversationRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => item && typeof item.id === 'string' && typeof item.content === 'string');
  } catch {
    return [];
  }
}

function parseIndex(raw: string | null): ArchiveIndex {
  if (!raw) return { chunks: 0, totalMessages: 0, updatedAt: new Date(0).toISOString() };
  try {
    const parsed = JSON.parse(raw) as Partial<ArchiveIndex>;
    return {
      chunks: Number.isFinite(parsed.chunks) ? Math.max(0, Number(parsed.chunks)) : 0,
      totalMessages: Number.isFinite(parsed.totalMessages) ? Math.max(0, Number(parsed.totalMessages)) : 0,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    return { chunks: 0, totalMessages: 0, updatedAt: new Date(0).toISOString() };
  }
}

function serializable(record: ConversationRecord): ConversationRecord {
  const attachment = record.attachment && typeof record.attachment === 'object'
    ? record.attachment as Record<string, unknown>
    : undefined;
  return {
    ...record,
    // Keep durable history small and safe to sync. A previously uploaded file
    // is represented by its URL/name; its large base64 payload is not copied
    // into every conversation archive chunk.
    ...(attachment ? { attachment: { ...attachment, base64: undefined } } : {}),
    timestamp: record.timestamp instanceof Date ? record.timestamp.toISOString() : record.timestamp,
  };
}

export function mergeUniqueConversationRecords(
  ...groups: ConversationRecord[][]
): ConversationRecord[] {
  const byId = new Map<string, ConversationRecord>();
  for (const group of groups) {
    for (const record of group) {
      if (!record || !record.id || record.type === 'loading') continue;
      byId.set(record.id, record);
    }
  }
  return [...byId.values()].sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
  });
}

export function loadRecentConversation(personaId: string): ConversationRecord[] {
  return parseRecords(accountLocalStorage.getItem(historyKey(personaId))).map(record => ({
    ...record,
    timestamp: new Date(record.timestamp),
  }));
}

export function saveRecentConversation(personaId: string, records: ConversationRecord[]) {
  const recent = mergeUniqueConversationRecords(records).slice(-RECENT_LIMIT).map(serializable);
  accountLocalStorage.setItem(historyKey(personaId), JSON.stringify(recent));
}

/**
 * Append-only, account-synced conversation archive. Each chunk stays small
 * enough for workspace sync, so history is not lost when the visible 300-turn
 * cache rolls over.
 */
export function archiveConversationRecords(personaId: string, records: ConversationRecord[]) {
  const clean = records.filter(record => record && record.type !== 'loading').map(serializable);
  if (clean.length === 0) return;

  let index = parseIndex(accountLocalStorage.getItem(archiveIndexKey(personaId)));
  let chunkNumber = Math.max(1, index.chunks || 1);
  let chunk = parseRecords(accountLocalStorage.getItem(archiveChunkKey(personaId, chunkNumber)));
  const knownIds = new Set(chunk.map(record => record.id));
  let added = 0;
  let updated = false;

  for (const record of clean) {
    if (knownIds.has(record.id)) {
      const existingIndex = chunk.findIndex(existing => existing.id === record.id);
      if (existingIndex >= 0) {
        chunk[existingIndex] = record;
        updated = true;
      }
      continue;
    }
    if (chunk.length >= ARCHIVE_CHUNK_SIZE) {
      accountLocalStorage.setItem(archiveChunkKey(personaId, chunkNumber), JSON.stringify(chunk));
      chunkNumber += 1;
      chunk = [];
      knownIds.clear();
    }
    chunk.push(record);
    knownIds.add(record.id);
    added += 1;
  }

  if (added === 0 && !updated) return;
  accountLocalStorage.setItem(archiveChunkKey(personaId, chunkNumber), JSON.stringify(chunk));
  index = {
    chunks: chunkNumber,
    totalMessages: index.totalMessages + added,
    updatedAt: new Date().toISOString(),
  };
  accountLocalStorage.setItem(archiveIndexKey(personaId), JSON.stringify(index));
}

export function loadConversationContext(personaId: string, limit = 80): ConversationRecord[] {
  const index = parseIndex(accountLocalStorage.getItem(archiveIndexKey(personaId)));
  const archived: ConversationRecord[] = [];
  for (let chunkNumber = index.chunks; chunkNumber >= 1 && archived.length < limit; chunkNumber -= 1) {
    archived.unshift(...parseRecords(accountLocalStorage.getItem(archiveChunkKey(personaId, chunkNumber))));
  }
  return mergeUniqueConversationRecords(archived, loadRecentConversation(personaId)).slice(-limit);
}

export function loadConversationArchive(personaId: string): ConversationRecord[] {
  const index = parseIndex(accountLocalStorage.getItem(archiveIndexKey(personaId)));
  const archived: ConversationRecord[] = [];
  for (let chunkNumber = 1; chunkNumber <= index.chunks; chunkNumber += 1) {
    archived.push(...parseRecords(accountLocalStorage.getItem(archiveChunkKey(personaId, chunkNumber))));
  }
  return mergeUniqueConversationRecords(archived, loadRecentConversation(personaId));
}

function memoryTerms(text: string): string[] {
  return [...new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .map(term => term.replace(/^['-]+|['-]+$/g, ''))
      .filter(term => term.length >= 3 && !MEMORY_STOP_WORDS.has(term)),
  )];
}

/**
 * Finds relevant older turns without sending the entire archive to the model.
 * Matching turns include their immediate neighbors so the recalled detail keeps
 * its original conversational context. The full archive remains account-synced.
 */
export function searchConversationMemories(personaId: string, query: string, limit = 12): ConversationRecord[] {
  const terms = memoryTerms(query);
  if (terms.length === 0 || limit <= 0) return [];
  const archive = loadConversationArchive(personaId);
  const normalizedQuery = query.trim().toLowerCase();
  const scored = archive.map((record, index) => {
    const content = record.content.toLowerCase();
    const overlap = terms.reduce((score, term) => score + (content.includes(term) ? 1 : 0), 0);
    const phraseBonus = normalizedQuery.length >= 8 && content.includes(normalizedQuery) ? 2 : 0;
    return { index, score: overlap + phraseBonus, timestamp: new Date(record.timestamp).getTime() || 0 };
  }).filter(candidate => candidate.score > 0)
    .sort((left, right) => right.score - left.score || right.timestamp - left.timestamp);

  const selected = new Set<number>();
  for (const candidate of scored) {
    for (const index of [candidate.index - 1, candidate.index, candidate.index + 1]) {
      if (index >= 0 && index < archive.length) selected.add(index);
      if (selected.size >= limit) break;
    }
    if (selected.size >= limit) break;
  }
  return [...selected].sort((left, right) => left - right).map(index => archive[index]);
}

export function migrateRecentConversationToArchive(personaId: string) {
  if (parseIndex(accountLocalStorage.getItem(archiveIndexKey(personaId))).chunks > 0) return;
  archiveConversationRecords(personaId, loadRecentConversation(personaId));
}

export function clearConversationHistory(personaId: string) {
  const index = parseIndex(accountLocalStorage.getItem(archiveIndexKey(personaId)));
  accountLocalStorage.removeItem(historyKey(personaId));
  accountLocalStorage.removeItem(archiveIndexKey(personaId));
  for (let chunkNumber = 1; chunkNumber <= index.chunks; chunkNumber += 1) {
    accountLocalStorage.removeItem(archiveChunkKey(personaId, chunkNumber));
  }
}

/** Removes one message from the visible history and every durable archive chunk. */
export function deleteConversationRecord(personaId: string, recordId: string) {
  if (!recordId) return;
  const recent = loadRecentConversation(personaId).filter(record => record.id !== recordId);
  saveRecentConversation(personaId, recent);

  const index = parseIndex(accountLocalStorage.getItem(archiveIndexKey(personaId)));
  let removed = 0;
  for (let chunkNumber = 1; chunkNumber <= index.chunks; chunkNumber += 1) {
    const key = archiveChunkKey(personaId, chunkNumber);
    const chunk = parseRecords(accountLocalStorage.getItem(key));
    const filtered = chunk.filter(record => record.id !== recordId);
    removed += chunk.length - filtered.length;
    if (filtered.length !== chunk.length) {
      accountLocalStorage.setItem(key, JSON.stringify(filtered));
    }
  }

  if (removed > 0) {
    accountLocalStorage.setItem(archiveIndexKey(personaId), JSON.stringify({
      ...index,
      totalMessages: Math.max(0, index.totalMessages - removed),
      updatedAt: new Date().toISOString(),
    }));
  }
}
