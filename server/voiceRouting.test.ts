import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isElevenLabsVoiceEngine,
  isDirectElevenLabsVoiceId,
  isProviderAccountUnavailableStatus,
  isValidPublicVoiceReference,
  normalizeNaturalVoiceGreeting,
  selectElevenLabsPersonaVoice,
} from './voiceRouting';

const voices = [
  { voice_id: 'rawan-current', name: 'Rawan Hasan (Authentic Clone)', category: 'cloned' },
  { voice_id: 'leen-current', name: 'Leen Hassan Creator Voice', category: 'cloned' },
  { voice_id: 'other', name: 'Madison', category: 'premade' },
];

test('keeps an existing saved ElevenLabs voice id', () => {
  assert.equal(selectElevenLabsPersonaVoice(voices, 'leen-current', 'Leen Hassan')?.voice_id, 'leen-current');
});

test('remaps a stale id to the same persona by name', () => {
  assert.equal(selectElevenLabsPersonaVoice(voices, 'stale-rawan-id', 'Rawan Hassan')?.voice_id, 'rawan-current');
});

test('tolerates Hasan and Hassan spelling without matching another persona', () => {
  assert.equal(selectElevenLabsPersonaVoice(voices, undefined, 'Rawan Hassan')?.voice_id, 'rawan-current');
  assert.equal(selectElevenLabsPersonaVoice(voices, undefined, 'Unknown Hassan'), undefined);
});

test('accepts only usable public or embedded audio references', () => {
  assert.equal(isValidPublicVoiceReference('https://cdn.example.com/rawan.mp3'), true);
  assert.equal(isValidPublicVoiceReference('http://localhost/rawan.mp3'), false);
  assert.equal(isValidPublicVoiceReference('not-base64'), false);
  assert.equal(isValidPublicVoiceReference('data:audio/mpeg;base64,bad padding'), false);
  const payload = Buffer.alloc(128, 7).toString('base64');
  assert.equal(isValidPublicVoiceReference(`data:audio/mpeg;base64,${payload}`), true);
});

test('recognizes terminal provider account statuses and ElevenLabs models', () => {
  assert.equal(isProviderAccountUnavailableStatus(402), true);
  assert.equal(isProviderAccountUnavailableStatus(429), false);
  assert.equal(isElevenLabsVoiceEngine('eleven_flash_v2_5'), true);
  assert.equal(isElevenLabsVoiceEngine('cartesia-sonic'), false);
  assert.equal(isDirectElevenLabsVoiceId('7jFje9BJoTWzqZzouT0j'), true);
  assert.equal(isDirectElevenLabsVoiceId('elevenlabs:rawan'), false);
});

test('keeps live-call greetings short, spoken, and free of stage directions', () => {
  assert.equal(
    normalizeNaturalVoiceGreeting('“[smiles] Mm, hey you. You okay?”', 'Hey—what\'s up?'),
    'Mm, hey you. You okay?',
  );
  assert.equal(
    normalizeNaturalVoiceGreeting(
      'Hello there. I am incredibly delighted that you decided to call me today because there are so many fascinating things that we could discuss together.',
      'Hey—what\'s up?',
    ),
    'Hey—what\'s up?',
  );
});
