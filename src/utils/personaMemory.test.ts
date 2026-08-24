import assert from 'node:assert/strict';
import test from 'node:test';

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

const { accountStorageKey, setActiveStorageUserId } = await import('./accountStorage');
const {
  addPersonaMemoryNote,
  buildRecentConversationSummary,
  deletePersonaMemoryNote,
  loadPersonaMemoryNotes,
  togglePersonaMemoryPinned,
  updatePersonaMemoryNote,
} = await import('./personaMemory');

test('migrates legacy string memories without losing them', () => {
  values.clear();
  setActiveStorageUserId('memory-migration-user');
  values.set(accountStorageKey('persona_memories_rawan', 'memory-migration-user'), JSON.stringify([
    'I have a son named Adam',
    'I prefer beach photos',
  ]));

  const notes = loadPersonaMemoryNotes('rawan', ['User is the creator']);
  assert.deepEqual(notes.map(note => note.text).sort(), [
    'I have a son named Adam',
    'I prefer beach photos',
    'User is the creator',
  ].sort());
  assert.ok(notes.every(note => typeof note.id === 'string' && note.id.length > 0));
});

test('supports adding, pinning, correcting, and forgetting one memory', () => {
  values.clear();
  setActiveStorageUserId('memory-actions-user');
  let notes = addPersonaMemoryNote('leen', 'My favorite city is Paris');
  const noteId = notes[0].id;

  notes = togglePersonaMemoryPinned('leen', noteId);
  assert.equal(notes.find(note => note.id === noteId)?.pinned, true);

  notes = updatePersonaMemoryNote('leen', noteId, 'My favorite city is Rome');
  assert.equal(notes.find(note => note.id === noteId)?.text, 'My favorite city is Rome');

  notes = deletePersonaMemoryNote('leen', noteId);
  assert.equal(notes.some(note => note.id === noteId), false);
});

test('summarizes shared text and voice context', () => {
  const summary = buildRecentConversationSummary([
    { id: 'u1', role: 'user', type: 'text', content: 'I was talking to my son.', timestamp: '2026-08-23T20:00:00.000Z', source: 'voice' },
    { id: 'p1', role: 'persona', type: 'text', content: 'I noticed someone else was nearby.', timestamp: '2026-08-23T20:00:01.000Z', source: 'voice' },
    { id: 'u2', role: 'user', type: 'text', content: 'Yes, that was him.', timestamp: '2026-08-23T20:00:02.000Z', source: 'text' },
  ], 'Rawan');

  assert.match(summary, /text and voice context/i);
  assert.match(summary, /Yes, that was him/);
  assert.match(summary, /Rawan replied/);
});
