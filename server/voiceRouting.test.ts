import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSpokenDialogueStream,
  isElevenLabsVoiceEngine,
  isDirectElevenLabsVoiceId,
  isProviderAccountUnavailableStatus,
  isValidPublicVoiceReference,
  normalizeNaturalVoiceGreeting,
  sanitizeSpokenDialogue,
  selectElevenLabsPersonaVoice,
  shapeNaturalSpokenReply,
  shouldAbandonVoiceProviderAliases,
} from './voiceRouting';

const voices = [
  { voice_id: 'rawan-current', name: 'Rawan Hasan (Authentic Clone)', category: 'cloned' },
  { voice_id: 'leen-current', name: 'Leen Hassan Creator Voice', category: 'cloned' },
  { voice_id: 'other', name: 'Madison', category: 'premade' },
];

test('keeps an existing saved ElevenLabs voice id', () => {
  assert.equal(selectElevenLabsPersonaVoice(voices, 'leen-current', 'Leen Hassan')?.voice_id, 'leen-current');
});

test('removes stage directions and delivery instructions from spoken dialogue', () => {
  assert.equal(
    sanitizeSpokenDialogue('*shy giggles* Oh, wow. (in a breathy tone) You remembered?'),
    'Oh, wow. You remembered?',
  );
  assert.equal(
    sanitizeSpokenDialogue('Tone: playful and slightly breathy. That is actually really sweet.'),
    'That is actually really sweet.',
  );
  assert.equal(
    sanitizeSpokenDialogue('<think>I should change the subject.</think> I missed you too.'),
    'I missed you too.',
  );
  assert.equal(
    sanitizeSpokenDialogue('Shy giggles, okay, you caught me. My voice softens into a breathy tone. What did you expect?'),
    'Okay, you caught me. What did you expect?',
  );
  assert.equal(
    sanitizeSpokenDialogue('*blushes deeply, giggling shyly* Oh, Dr. H. *peeks up shyly* I got distracted. *closes eyes and concentrates* Okay, how is this?'),
    'Oh, Dr. H. I got distracted. Okay, how is this?',
  );
});

test('streams only complete sanitized speech while preserving natural dialogue', () => {
  const chunks: string[] = [];
  const stream = createSpokenDialogueStream(chunk => chunks.push(chunk));
  stream.push('*shy ');
  stream.push('giggles* Mm, I missed you. Tone: soft and intimate. ');
  stream.push('How was your day?');

  assert.equal(stream.flush(), 'Mm, I missed you. How was your day?');
  assert.deepEqual(chunks, ['Mm, I missed you.', ' How was your day?']);
});

test('allows a final identity guard before each spoken stream segment is emitted', () => {
  const chunks: string[] = [];
  const stream = createSpokenDialogueStream(
    chunk => chunks.push(chunk),
    spokenPart => spokenPart.replace(/^Leen,\s*/i, 'Dr. H, '),
  );
  stream.push('Leen, I am sorry. ');
  stream.push('I misunderstood you.');

  assert.equal(stream.flush(), 'Dr. H, I am sorry. I misunderstood you.');
  assert.deepEqual(chunks, ['Dr. H, I am sorry.', ' I misunderstood you.']);
});

test('shapes a roleplay model reply into concise human dialogue', () => {
  assert.equal(
    shapeNaturalSpokenReply(
      "Uh, well... I guess one thing I did today was try to bake a cake, but it didn't turn out so great. The frosting was lumpy and the cake was dry. I'm not really a good baker. Wait, um, so Dr. H, what's your favorite color?",
    ),
    "Uh, I guess one thing I did today was try to bake a cake, but it didn't turn out so great. So Dr. H, what's your favorite color?",
  );
});

test('preserves natural ellipses and normalizes creator-name spacing', () => {
  assert.equal(
    shapeNaturalSpokenReply("Well, I'd make it look a little more... real, I guess?"),
    "Well, I'd make it look a little more... real, I guess?",
  );
  assert.equal(sanitizeSpokenDialogue('It is good to see you again, Dr.H!'), 'It is good to see you again, Dr. H!');
});

test('can defer voice streaming until one shaped continuous reply is ready', () => {
  const chunks: string[] = [];
  const stream = createSpokenDialogueStream(
    chunk => chunks.push(chunk),
    spokenPart => spokenPart,
    { deferUntilFlush: true, maxSentences: 2, maxFillers: 1 },
  );
  stream.push('Well, I tried baking today. ');
  stream.push('Um, it went badly. ');
  stream.push('Wait, what did you do today?');

  assert.equal(stream.flush(), 'Well, I tried baking today. What did you do today?');
  assert.deepEqual(chunks, ['Well, I tried baking today. What did you do today?']);
});

test('keeps the first complete question instead of an orphaned follow-up fragment', () => {
  assert.equal(
    shapeNaturalSpokenReply(
      'I spent most of the day painting. It was relaxing. What about you? Like, a hobby or interest you are excited about?',
    ),
    'I spent most of the day painting. What about you?',
  );
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

test('abandons provider aliases after timeouts and upstream failures', () => {
  assert.equal(shouldAbandonVoiceProviderAliases({ name: 'AbortError' }), true);
  assert.equal(shouldAbandonVoiceProviderAliases({ status: 504 }), true);
  assert.equal(shouldAbandonVoiceProviderAliases({ status: 429 }), true);
  assert.equal(shouldAbandonVoiceProviderAliases({ status: 404 }), false);
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
