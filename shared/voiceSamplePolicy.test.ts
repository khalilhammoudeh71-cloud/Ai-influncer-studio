import test from 'node:test';
import assert from 'node:assert/strict';
import { VOICE_CLONING_MODELS, voiceSamplePolicy, voiceCloningModel } from './voiceCloningModels';
test('every available recording model has a bounded sample policy', () => {
 for (const model of VOICE_CLONING_MODELS) {
  const policy = voiceSamplePolicy(model);
  if (model.kind === 'preset' || model.kind === 'unavailable') assert.equal(policy.files, 0);
  else { assert.ok(policy.seconds > 0 && policy.seconds <= 300); assert.equal(policy.files, model.id === 'elevenlabs' ? 10 : 1); }
 }
});
test('provider-specific duration policies remain distinct', () => {
 assert.equal(voiceSamplePolicy(voiceCloningModel('minimax-clone')!).seconds,300);
 assert.equal(voiceSamplePolicy(voiceCloningModel('wavespeed:qwen3-clone')!).seconds,15);
 assert.equal(voiceSamplePolicy(voiceCloningModel('elevenlabs')!).seconds,120);
});
