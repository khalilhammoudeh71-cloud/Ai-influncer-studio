import assert from 'node:assert/strict';
import test from 'node:test';
import {
  drainSseData,
  getRealtimeTranscriptionRecoveryAction,
  getVoiceTurnCommitDelay,
  isLikelyPersonaEcho,
  mergeVoiceTranscriptSegments,
  shouldInterruptPersonaSpeech,
  summarizeVoiceLatency,
  takeSpeakableSpeechChunk,
} from './voiceStability';

test('bounds realtime transcription reconnects before using browser fallback', () => {
  assert.equal(getRealtimeTranscriptionRecoveryAction(1), 'reconnect');
  assert.equal(getRealtimeTranscriptionRecoveryAction(2), 'reconnect');
  assert.equal(getRealtimeTranscriptionRecoveryAction(3), 'browser-fallback');
});

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

test('commits complete voice turns quickly but gives unfinished thoughts breathing room', () => {
  assert.equal(getVoiceTurnCommitDelay('Yes, that works.', {
    source: 'realtime',
  }), 90);
  assert.equal(getVoiceTurnCommitDelay('I was thinking', {
    source: 'realtime',
  }), 700);
  assert.equal(getVoiceTurnCommitDelay('Can you make an image with', {
    source: 'browser',
  }), 900);
  assert.equal(getVoiceTurnCommitDelay('Actually stop', {
    source: 'realtime',
  }), 90);
  assert.equal(getVoiceTurnCommitDelay('Yes', {
    source: 'realtime',
  }), 260);
});

test('merges recognition commits without repeating overlapping words', () => {
  assert.equal(
    mergeVoiceTranscriptSegments('I want an image of', 'an image of Leen by the window'),
    'I want an image of Leen by the window',
  );
  assert.equal(
    mergeVoiceTranscriptSegments('Tell me about tonight', 'Tell me about tonight'),
    'Tell me about tonight',
  );
  assert.equal(
    mergeVoiceTranscriptSegments('Yes, that works.', 'Yes that works'),
    'Yes, that works.',
  );
  assert.equal(
    mergeVoiceTranscriptSegments('I was thinking', 'maybe we could go outside'),
    'I was thinking maybe we could go outside',
  );
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

test('starts the first spoken phrase from a natural clause before the reply finishes', () => {
  assert.deepEqual(takeSpeakableSpeechChunk(
    "Absolutely, that sounds like a great idea, and I would love to hear more",
    { firstChunk: true },
  ), {
    chunk: 'Absolutely, that sounds like a great idea,',
    remainder: 'and I would love to hear more',
  });
});

test('starts a short conversational reply after the early speech window', () => {
  assert.deepEqual(takeSpeakableSpeechChunk(
    "I would love to hear more about",
    { firstChunk: true, allowEarlyPartial: true },
  ), {
    chunk: 'I would love to hear more',
    remainder: 'about',
  });
});

test('keeps incomplete short text buffered until it is safe to speak', () => {
  assert.deepEqual(takeSpeakableSpeechChunk('I would', { firstChunk: true }), {
    remainder: 'I would',
  });
});

test('flushes a complete short answer immediately', () => {
  assert.deepEqual(takeSpeakableSpeechChunk('Yes, absolutely!', { firstChunk: true }), {
    chunk: 'Yes, absolutely!',
    remainder: '',
  });
});
