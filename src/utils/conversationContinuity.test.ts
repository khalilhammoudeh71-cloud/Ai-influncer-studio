import assert from 'node:assert/strict';
import test from 'node:test';
import type { ConversationRecord } from './conversationContinuity';

const values = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => { values.delete(key); },
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
  },
});
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: globalThis.localStorage,
});

const {
  archiveConversationRecords,
  clearConversationHistory,
  deleteConversationRecord,
  loadConversationContext,
  mergeUniqueConversationRecords,
  saveRecentConversation,
  searchConversationMemories,
} = await import('./conversationContinuity');
const { setActiveStorageUserId } = await import('./accountStorage');

const record = (id: string, content: string, timestamp: string): ConversationRecord => ({
  id,
  role: id.startsWith('u') ? 'user' : 'persona',
  type: 'text',
  content,
  timestamp,
});

test('merges voice and text records once in chronological order', () => {
  const voice = [
    record('u1', 'I was talking to my son', '2026-08-23T20:00:00.000Z'),
    record('p1', 'I could tell someone else was nearby.', '2026-08-23T20:00:01.000Z'),
  ];
  const text = [
    voice[1],
    record('u2', 'I was talking to someone else, yeah', '2026-08-23T20:00:02.000Z'),
  ];

  assert.deepEqual(
    mergeUniqueConversationRecords(text, voice).map(item => item.id),
    ['u1', 'p1', 'u2'],
  );
});

test('does not archive loading placeholders', () => {
  const merged = mergeUniqueConversationRecords([
    { ...record('loading', '', '2026-08-23T20:00:00.000Z'), type: 'loading' },
    record('u1', 'hello', '2026-08-23T20:00:01.000Z'),
  ]);
  assert.deepEqual(merged.map(item => item.id), ['u1']);
});

test('restores a shared voice and text timeline after reload', () => {
  values.clear();
  setActiveStorageUserId('continuity-test-user');
  const personaId = 'rawan';
  const timeline = [
    { ...record('u1', 'I was talking to my son', '2026-08-23T20:00:00.000Z'), source: 'voice' as const },
    { ...record('p1', 'I noticed someone else was nearby.', '2026-08-23T20:00:01.000Z'), source: 'voice' as const },
    { ...record('u2', 'I was talking to someone else, yeah', '2026-08-23T20:00:02.000Z'), source: 'text' as const },
  ];

  saveRecentConversation(personaId, timeline);
  archiveConversationRecords(personaId, timeline);

  assert.deepEqual(
    loadConversationContext(personaId, 20).map(item => [item.id, item.source]),
    [['u1', 'voice'], ['p1', 'voice'], ['u2', 'text']],
  );
  clearConversationHistory(personaId);
  assert.deepEqual(loadConversationContext(personaId, 20), []);
});

test('does not duplicate uploaded attachment data into the durable archive', () => {
  values.clear();
  setActiveStorageUserId('attachment-test-user');
  const personaId = 'leen';
  archiveConversationRecords(personaId, [{
    ...record('u1', 'Here is the reference image', '2026-08-23T20:00:00.000Z'),
    attachment: { name: 'reference.png', type: 'image', base64: 'data:image/png;base64,large-payload' },
  }]);

  const restored = loadConversationContext(personaId, 20);
  assert.equal(restored.length, 1);
  assert.deepEqual(restored[0].attachment, {
    name: 'reference.png',
    type: 'image',
  });
});

test('recalls a relevant older conversation beyond the recent window', () => {
  values.clear();
  setActiveStorageUserId('long-memory-test-user');
  const personaId = 'rawan';
  const archive = Array.from({ length: 200 }, (_, index) => record(
    index % 2 === 0 ? `u${index}` : `p${index}`,
    index === 12 ? 'My son and I are training for the Cairo marathon in November.' : `Conversation turn ${index}`,
    new Date(Date.UTC(2026, 7, 1, 0, index)).toISOString(),
  ));
  archiveConversationRecords(personaId, archive);
  saveRecentConversation(personaId, archive.slice(-60));

  const recalled = searchConversationMemories(personaId, 'Do you remember the marathon with my son?', 6);
  assert.ok(recalled.some(item => item.id === 'u12'));
  assert.ok(recalled.some(item => item.id === 'p11' || item.id === 'p13'));
});

test('deletes an image from recent history and the durable archive', () => {
  values.clear();
  setActiveStorageUserId('delete-image-test-user');
  const personaId = 'rawan';
  const image: ConversationRecord = {
    ...record('p-image', 'https://cdn.example.com/generated.png', '2026-08-23T20:00:01.000Z'),
    type: 'image',
    prompt: 'posing at the beach',
  };
  const timeline = [record('u1', 'Generate a beach image', '2026-08-23T20:00:00.000Z'), image];
  saveRecentConversation(personaId, timeline);
  archiveConversationRecords(personaId, timeline);

  deleteConversationRecord(personaId, image.id);

  assert.deepEqual(loadConversationContext(personaId, 20).map(item => item.id), ['u1']);
  assert.equal(searchConversationMemories(personaId, 'beach image', 6).some(item => item.id === image.id), false);
});
