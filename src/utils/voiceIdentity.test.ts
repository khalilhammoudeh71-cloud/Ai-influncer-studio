import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createVoiceIdentityProfile,
  isEnrolledSpeaker,
  parseVoiceIdentityProfile,
  VOICE_IDENTITY_VECTOR_SIZE,
} from './voiceIdentity';

const voice = (offset: number) => Array.from({ length: 40 }, (_, sample) => {
  const vector = Array.from({ length: VOICE_IDENTITY_VECTOR_SIZE }, (_, index) =>
    Math.sin((index + 1) * (0.33 + offset)) + Math.cos(sample * 0.03 + index * 0.11),
  );
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return vector.map(value => value / magnitude);
});

test('accepts the enrolled speaker and rejects a different spectral profile', () => {
  const profile = createVoiceIdentityProfile(voice(0));
  assert.ok(profile);
  assert.equal(isEnrolledSpeaker(profile!, voice(0.005)), true);
  assert.equal(isEnrolledSpeaker(profile!, voice(0.55)), false);
});

test('parses only complete versioned profiles', () => {
  const profile = createVoiceIdentityProfile(voice(0));
  assert.ok(parseVoiceIdentityProfile(JSON.stringify(profile)));
  assert.equal(parseVoiceIdentityProfile('{"version":1,"centroid":[1]}'), null);
});

