import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeVoiceDraft, VoiceDraftGuard, LatestVoicePreview } from './personaVoiceLifecycle';

test('unrelated edit preserves a saved binding and all its settings', () => {
  const saved = { voiceId: 'original', voiceEngine: 'elevenlabs', voiceLikeness: 92, voiceSampleUrl: 'sample', audioSamples: ['a'] };
  assert.deepEqual(mergeVoiceDraft(saved, { name: 'Renamed' }), saved);
  assert.equal(mergeVoiceDraft(saved, { voiceId: 'replacement' }).voiceEngine, 'elevenlabs');
});

test('late clone cannot replace a more recently chosen voice', () => {
  const draft = new VoiceDraftGuard();
  const operation = draft.begin();
  draft.change();
  assert.equal(draft.isCurrent(operation), false);
});

test('late preview never starts after replacement or navigation', async () => {
  const preview = new LatestVoicePreview();
  let resolve!: (value: string) => void;
  const started: string[] = [];
  const first = preview.play(() => new Promise<string>(r => { resolve = r; }), url => { started.push(url); return { pause() {} }; });
  await preview.play(async () => 'B', url => { started.push(url); return { pause() {} }; });
  resolve('A'); await first;
  assert.deepEqual(started, ['B']);
  let stopped = false;
  await preview.play(async () => 'C', () => ({ pause() { stopped = true; } }));
  preview.stop(); assert.equal(stopped, true);
});
