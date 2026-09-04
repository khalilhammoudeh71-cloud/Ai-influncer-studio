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
  isDurablePersonaMemoryText,
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

test('keeps only stable facts in automatic persona memory', () => {
  assert.equal(isDurablePersonaMemoryText('I want to see you tonight.'), false);
  assert.equal(isDurablePersonaMemoryText('So you remember the dream I told you about?'), false);
  assert.equal(isDurablePersonaMemoryText('And I like this image, make it naked.'), false);
  assert.equal(isDurablePersonaMemoryText('My name is Dr. H.'), true);
  assert.equal(isDurablePersonaMemoryText('I prefer late-night calls.'), true);
  assert.equal(isDurablePersonaMemoryText('You have three sisters.'), true);
});

test('repairs legacy object memories and pins seeded defaults once', () => {
  values.clear();
  setActiveStorageUserId('memory-quality-user');
  const key = accountStorageKey('persona_memories_leen', 'memory-quality-user');
  values.set(key, JSON.stringify([
    { id: 'default-old', text: "User's name is Dr. H", pinned: false, source: 'automatic', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'noise', text: 'I want to see you tonight.', pinned: false, source: 'automatic', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'family', text: 'You have three sisters.', pinned: false, source: 'automatic', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  ]));

  const notes = loadPersonaMemoryNotes('leen', ["User's name is Dr. H"]);
  assert.equal(notes.some(note => note.text === 'I want to see you tonight.'), false);
  assert.equal(notes.find(note => note.id === 'default-old')?.pinned, true);
  assert.equal(notes.find(note => note.id === 'default-old')?.source, 'default');
  assert.equal(notes.some(note => note.text === 'You have three sisters.'), true);
});
