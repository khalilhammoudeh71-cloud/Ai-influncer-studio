import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FAL_MAYA_SAMPLE_RATE,
  nextMayaAudioChunk,
  buildMayaVoicePrompt,
  extractFalPcmChunk,
  shapeMayaSpeechText,
} from './mayaVoice';

test('builds a natural voice prompt from saved persona voice settings without audiobook delivery', () => {
  const prompt = buildMayaVoicePrompt({
    name: 'Leen Hassan',
    tone: 'warm, witty, and flirty',
    voicePrompt: 'subtle Levantine-American accent with a medium-low pitch',
    voiceSpeakingSpeed: 42,
  });
  assert.match(prompt, /adult woman/i);
  assert.match(prompt, /warm, witty, and flirty/i);
  assert.match(prompt, /subtle Levantine-American accent/i);
  assert.match(prompt, /relaxed, unhurried conversational pace/i);
  assert.match(prompt, /never sound like an announcer/i);
  assert.equal(FAL_MAYA_SAMPLE_RATE, 24_000);
});

test('adds a private Maya delivery cue without changing the visible dialogue', () => {
  assert.equal(
    shapeMayaSpeechText('Come closer and tell me what you want.', { tone: 'seductive' }),
    '<whisper> Come closer and tell me what you want.',
  );
  assert.equal(shapeMayaSpeechText('What happened today?'), '<curious> What happened today?');
  assert.equal(shapeMayaSpeechText('<chuckle> You caught me.'), '<chuckle> You caught me.');
});

test('extracts raw and hex-encoded PCM events while rejecting malformed payloads', () => {
  assert.deepEqual(Array.from(extractFalPcmChunk(new Uint8Array([1, 2, 3])) || []), [1, 2, 3]);
  assert.deepEqual(Array.from(extractFalPcmChunk({ audio: '0001ff' }) || []), [0, 1, 255]);
  assert.equal(extractFalPcmChunk({ audio: 'not-hex' }), undefined);
  assert.equal(extractFalPcmChunk({ done: true }), undefined);
});

test('Maya voice descriptions fit the provider 500-character limit', () => {
  const prompt = buildMayaVoicePrompt({
    name: 'Rawan Hasan',
    tone: 'Warm and expressive. '.repeat(30),
    voicePrompt: 'Soft, clear conversational voice. '.repeat(30),
  });
  assert.ok(prompt.length <= 500);
  assert.match(prompt, /adult woman/);
});


test('Maya timeout releases a call when no audio arrives', async () => {
  let aborted = false;
  await assert.rejects(nextMayaAudioChunk({ next: () => new Promise<never>(() => {}) }, () => { aborted = true; }, 5), /timed out/);
  assert.equal(aborted, true);
});

test('Maya forwards available audio without aborting the stream', async () => {
  const chunk = { done: false as const, value: new Uint8Array([1, 2]) };
  assert.deepEqual(await nextMayaAudioChunk({ next: async () => chunk }, () => { throw new Error('unexpected abort'); }), chunk);
});
