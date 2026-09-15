import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAgentSpeechRequest, validateAgentSpeechResponse } from './agentVoice';
const fallback = { voiceId: 'superagent-clone', voiceSampleUrl: 'other-sample', voiceEngine: 'omnivoice' };
test('a saved ElevenLabs binding wins over its old source recording and super-agent defaults', () => {
  const request = buildAgentSpeechRequest('Hello.', { id: 'fixture', name: 'Mira', voiceId: 'fixturevoice123456789', voiceEngine: 'elevenlabs', voiceSampleUrl: 'original', voiceStability: 72, voiceLikeness: 91, voiceStyleExaggeration: 0, voiceSpeakingSpeed: 1.1 }, fallback);
  assert.equal(request.voiceId, 'fixturevoice123456789');
  assert.equal(request.voiceReference, undefined);
  assert.equal(request.engine, 'elevenlabs');
  assert.deepEqual(request.voiceSettings, { stability: 0.72, similarity_boost: 0.91, style: 0, speed: 1.1 });
});
test('a persona with no voice never borrows a different super-agent clone', () => {
  const request = buildAgentSpeechRequest('Hello.', { id: 'fixture', name: 'Mira' }, fallback);
  assert.equal(request.voiceId, undefined);
  assert.equal(request.voiceReference, undefined);
});
test('an explicit non-ElevenLabs reference retains its chosen engine and recording', () => {
  const request = buildAgentSpeechRequest('Hello.', { id: 'fixture', name: 'Mira', voiceEngine: 'omnivoice', voiceSampleUrl: 'original' }, fallback);
  assert.equal(request.engine, 'omnivoice');
  assert.equal(request.voiceReference, 'original');
});
test('rejects wrong voice/provider and empty audio before playback', () => {
  const request = buildAgentSpeechRequest('Hello.', { voiceId: 'fixturevoice123456789', voiceEngine: 'elevenlabs' }, fallback);
  assert.throws(() => validateAgentSpeechResponse(request, { audioUrl: 'fixture.mp3', engine: 'openai' }), /voice/i);
  assert.throws(() => validateAgentSpeechResponse(request, { audioUrl: 'fixture.mp3', engine: 'elevenlabs', voiceId: 'different' }), /voice/i);
  assert.throws(() => validateAgentSpeechResponse(request, {}), /audio/i);
  assert.equal(validateAgentSpeechResponse(request, { audioUrl: 'fixture.mp3', engine: 'elevenlabs', voiceId: 'fixturevoice123456789' }), 'fixture.mp3');
});
