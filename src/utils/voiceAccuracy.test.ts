import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addVoiceTerms,
  applyVoiceCorrections,
  buildVoiceKeyterms,
  deriveCalibrationCorrections,
  isDuplicateVoiceTranscript,
  needsVoiceConfirmation,
  parseVoiceAccuracyProfile,
  saveVoiceCorrection,
} from './voiceAccuracy';

test('learns and applies a recurring phrase correction', () => {
  const profile = saveVoiceCorrection(parseVoiceAccuracyProfile(null), 'lean has an', 'Leen Hassan');
  assert.equal(applyVoiceCorrections('show me lean has an in a dress', profile.corrections), 'show me Leen Hassan in a dress');
});

test('builds deduplicated recognition hints from names, terms, and corrections', () => {
  let profile = addVoiceTerms(parseVoiceAccuracyProfile(null), ['Seedream 5.0 Pro', 'Dr. H']);
  profile = saveVoiceCorrection(profile, 'sea dance', 'Seedance');
  const terms = buildVoiceKeyterms(profile, ['Dr. H', 'Leen Hassan']);
  assert.deepEqual(terms, ['Dr. H', 'Leen Hassan', 'Seedream 5.0 Pro', 'Seedance', 'sea dance']);
});

test('keeps realtime keyterms within ElevenLabs limits', () => {
  const profile = addVoiceTerms(
    parseVoiceAccuracyProfile(null),
    [...Array(60)].map((_, index) => `custom term ${index}`),
  );
  const terms = buildVoiceKeyterms(profile, ['this term is deliberately longer than twenty characters']);
  assert.equal(terms.length, 50);
  assert.equal(terms.every(term => term.length <= 20), true);
});

test('derives focused corrections from a calibration sentence', () => {
  const corrections = deriveCalibrationCorrections(
    'generate an image of lean has an using sea dream 5 pro',
    'Generate an image of Leen Hassan using Seedream 5.0 Pro',
  );
  assert.deepEqual(corrections, [
    { heard: 'lean has an', intended: 'Leen Hassan' },
    { heard: 'sea dream 5', intended: 'Seedream 5.0' },
  ]);
});

test('blocks a stale multiword committed transcript but allows a later repeat', () => {
  const previous = { text: 'how are you doing', at: 10_000 };
  assert.equal(isDuplicateVoiceTranscript('how are you doing', previous, 15_000), true);
  assert.equal(isDuplicateVoiceTranscript('how are you doing', previous, 19_000), false);
});

test('only asks for confirmation on incomplete media requests', () => {
  assert.equal(needsVoiceConfirmation('generate an image of'), true);
  assert.equal(needsVoiceConfirmation('generate an image of Leen in a fancy dress'), false);
  assert.equal(needsVoiceConfirmation('how are you doing'), false);
});
