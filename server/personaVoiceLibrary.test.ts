import test from 'node:test';
import assert from 'node:assert/strict';
import { rememberPersonaVoices, removeRememberedVoice } from './personaVoiceLibrary';
import { restoreSavedVoice } from '../shared/personaVoiceLibrary';

const a = { voiceId: 'clone-a', voiceEngine: 'elevenlabs', voiceName: 'Warm original', voiceLikeness: 92, voiceStability: 64, voiceSampleUrl: 'supabase-media://alice/audio/a.wav', audioSamples: [{ name: 'Original', base64: 'supabase-media://alice/audio/a.wav' }] };
const b = { voiceId: 'clone-b', voiceEngine: 'elevenlabs', voiceName: 'New voice', voiceLikeness: 81, voiceSampleUrl: 'supabase-media://alice/audio/b.wav', audioSamples: [{ name: 'New', base64: 'supabase-media://alice/audio/b.wav' }] };

test('replacing a default keeps both voices and restores the original recordings and settings', () => {
  const library = rememberPersonaVoices([], a, b, 'Persona', '2026-09-15T00:00:00Z');
  assert.equal(library.length, 2);
  const restored = restoreSavedVoice(library.find(v => v.voiceId === 'clone-a')!);
  assert.equal(restored.voiceId, 'clone-a');
  assert.equal(restored.voiceLikeness, 92);
  assert.equal(restored.voiceStability, 64);
  assert.equal(restored.voiceSampleUrl, 'supabase-media://alice/audio/a.wav');
  assert.deepEqual(restored.audioSamples, [{ name: 'Original', base64: 'supabase-media://alice/audio/a.wav' }]);
});

test('saving and restoring repeatedly does not duplicate or expire voices', () => {
  let library = rememberPersonaVoices([], a, b, 'Persona', '2026-09-15T00:00:00Z');
  const originalId = library.find(v => v.voiceId === a.voiceId)!.id;
  library = rememberPersonaVoices(library, b, a, 'Persona renamed', '2036-09-15T00:00:00Z');
  library = rememberPersonaVoices(library, a, { ...a, voiceLikeness: 95 }, 'Persona', '2036-09-16T00:00:00Z');
  assert.equal(library.length, 2);
  assert.equal(library.find(v => v.voiceId === a.voiceId)!.id, originalId);
  assert.equal(library.find(v => v.voiceId === a.voiceId)!.voiceLikeness, 95);
  assert.equal(library.find(v => v.voiceId === b.voiceId)!.name, 'New voice');
});

test('different reference clones in the same engine remain separate without remote IDs', () => {
  const old = { ...a, voiceId: '', voiceEngine: 'wiro-voice:fishaudio/s2-pro' };
  const next = { ...b, voiceId: '', voiceEngine: old.voiceEngine };
  assert.equal(rememberPersonaVoices([], old, next, 'Persona').length, 2);
});

test('same ID in different providers remains separate', () => {
  assert.equal(rememberPersonaVoices([], a, { ...a, voiceEngine: 'fish-audio' }, 'Persona').length, 2);
});

test('expiring signed audio links become permanent references without duplicating the voice', () => {
  const signed = 'https://example.supabase.co/storage/v1/object/sign/workspace-media/alice%2Faudio%2Fa.wav?token=expiring';
  const library = rememberPersonaVoices([], a, { ...a, voiceSampleUrl: signed, audioSamples: [{ name: 'Original', base64: signed }] }, 'Persona');
  assert.equal(library.length, 1);
  assert.equal(library[0].voiceSampleUrl, 'supabase-media://alice/audio/a.wav');
  assert.equal(library[0].audioSamples?.[0].base64, 'supabase-media://alice/audio/a.wav');
});

test('restoring an ID-only voice clears the newer reference audio and uses its own delivery defaults', () => {
  const [saved] = rememberPersonaVoices([], {}, { voiceId: 'id-only', voiceEngine: 'elevenlabs' }, 'Persona');
  const restored = { ...b, ...restoreSavedVoice(saved) };
  assert.equal(restored.voiceSampleUrl, '');
  assert.deepEqual(restored.audioSamples, []);
  assert.equal(restored.voicePrompt, '');
  assert.equal(restored.voiceStability, 75);
});

test('keeps only voice fields, preserves account scope, and never archives an empty selection', () => {
  assert.deepEqual(rememberPersonaVoices([], {}, {}, 'Persona'), []);
  const [saved] = rememberPersonaVoices([], {}, { ...a, apiKey: 'secret', bio: 'private biography', voiceBinding: { account: 'account-a', provider: 'elevenlabs', apiKey: 'secret' } }, 'Persona');
  assert.equal(saved.account, 'account-a');
  assert.equal(JSON.stringify(saved).includes('secret'), false);
  assert.equal(JSON.stringify(saved).includes('biography'), false);
});

test('clearing active enrollment samples does not erase recordings from the saved voice', () => {
  const library = rememberPersonaVoices([], a, { ...a, voiceSampleUrl: '', audioSamples: [] }, 'Persona');
  assert.equal(library.length, 1);
  assert.equal(library[0].voiceSampleUrl, 'supabase-media://alice/audio/a.wav');
  assert.equal(library[0].audioSamples?.length, 1);
});


test('removal clears an active binding without restoring it on the next library read', () => {
  const library = rememberPersonaVoices([], a, b, 'Persona');
  const removal = removeRememberedVoice(library, b, 'Persona', library.find(v => v.voiceId === b.voiceId)!.id)!;
  assert.equal(removal.removingCurrent, true);
  assert.deepEqual(rememberPersonaVoices(removal.library, {}, {}, 'Persona').map(v => v.voiceId), [a.voiceId]);
});

test('removing a historical reference voice preserves the active voice and rejects foreign entries', () => {
  const reference = { ...a, voiceId: '', voiceEngine: 'wiro-voice:fishaudio/s2-pro' };
  const library = rememberPersonaVoices([], reference, b, 'Persona');
  const removal = removeRememberedVoice(library, b, 'Persona', library.find(v => v.voiceEngine === reference.voiceEngine)!.id)!;
  assert.equal(removal.removingCurrent, false);
  assert.deepEqual(removal.library.map(v => v.voiceId), [b.voiceId]);
  assert.equal(removeRememberedVoice(library, b, 'Persona', 'not-in-this-persona'), null);
});
