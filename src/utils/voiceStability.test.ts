import assert from 'node:assert/strict';
import test from 'node:test';
import {
  drainSseData,
  isLikelyPersonaEcho,
  shouldInterruptPersonaSpeech,
  summarizeVoiceLatency,
} from './voiceStability';

test('detects exact and lightly varied persona speaker leakage', () => {
  const spoken = 'I think that would be really fun, and I would love to try it with you.';
  assert.equal(isLikelyPersonaEcho('that would be really fun and I would love to try it', spoken), true);
  assert.equal(isLikelyPersonaEcho('I think that would be fun and would love to try it with you', spoken), true);
});

test('does not suppress short replies or explicit interruptions', () => {
  const spoken = 'Yes, I would love that too.';
  assert.equal(isLikelyPersonaEcho('yes', spoken), false);
  assert.equal(isLikelyPersonaEcho('wait I did not ask for that', spoken), false);
});

test('interrupts from realtime partials sooner while browser fallback requires voice energy', () => {
  const base = { personaSpeech: 'Let me tell you about my day', personaIsSpeaking: true };
  assert.equal(shouldInterruptPersonaSpeech('hold on', { ...base, source: 'browser' }), true);
  assert.equal(shouldInterruptPersonaSpeech('I need', { ...base, source: 'realtime' }), true);
  assert.equal(shouldInterruptPersonaSpeech('I need', { ...base, source: 'browser', hasFreshVoiceEnergy: false }), false);
  assert.equal(shouldInterruptPersonaSpeech('I need', { ...base, source: 'browser', hasFreshVoiceEnergy: true }), true);
  assert.equal(shouldInterruptPersonaSpeech('tell you about my day', { ...base, source: 'realtime' }), false);
});

test('allows a new utterance to cancel a pending response before audio begins', () => {
  assert.equal(shouldInterruptPersonaSpeech('actually instead', {
    source: 'realtime',
    personaIsSpeaking: false,
    responseIsPending: true,
  }), true);
});

test('drains complete SSE events and preserves a split tail', () => {
  const first = drainSseData('data: {"text":"Hi"}\n\ndata: {"text":" the');
  assert.deepEqual(first.data, ['{"text":"Hi"}']);
  assert.equal(first.remainder, 'data: {"text":" the');

  const second = drainSseData(`${first.remainder}re"}\n\ndata: {"done":true}`, true);
  assert.deepEqual(second.data, ['{"text":" there"}', '{"done":true}']);
  assert.equal(second.remainder, '');
});

test('summarizes the individual live voice latency stages', () => {
  assert.deepEqual(summarizeVoiceLatency({
    speechStartedAt: 100,
    transcriptCommittedAt: 650,
    requestStartedAt: 660,
    firstTextAt: 920,
    firstAudioAt: 1_180,
  }), {
    recognitionMs: 550,
    modelMs: 260,
    speechMs: 260,
    responseMs: 520,
    endToEndMs: 1_080,
  });
});
