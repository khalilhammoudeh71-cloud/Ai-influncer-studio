import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSpokenDialogueStream,
  DEFAULT_WAVESPEED_PERSONA_FALLBACK_MODEL,
  DEFAULT_ELEVENLABS_PERSONA_MODEL,
  DEFAULT_VENICE_PERSONA_MODEL,
  getElevenLabsPersonaVoiceSettings,
  getElevenLabsPersonaModelCandidates,
  getElevenLabsTtsQuery,
  getVoiceCandidateRepairInstruction,
  getVenicePersonaModelCandidates,
  inferPersonaVoiceAffect,
  resolveElevenLabsPersonaModelId,
  isElevenLabsVoiceEngine,
  isDirectElevenLabsVoiceId,
  isLawfulAdultVoiceConversation,
  isProviderAccountUnavailableStatus,
  isRoboticVoiceCandidate,
  isValidPublicVoiceReference,
  isVoiceProviderRefusal,
  isVoiceProviderEcho,
  reviewVoiceCandidate,
  buildVoiceTurnContract,
  normalizeNaturalVoiceGreeting,
  sanitizeSpokenDialogue,
  selectElevenLabsPersonaVoice,
  shapeNaturalSpokenReply,
  shouldAbandonVoiceProviderAliases,
  shouldRetryLawfulAdultVoiceRefusal,
  shouldRetryVoiceCandidateOnPrimary,
  shouldUseVenicePersonaLlm,
  shouldUseWaveSpeedDeepSeekFallback,
} from './voiceRouting';

test('detects exact and near-verbatim voice response echoes', () => {
  assert.equal(isVoiceProviderEcho(
    'Uh, not too bad. Uh, listen, do you remember the dream I, I told you that I, uh, had, uh, yesterday?',
    'Uh, not too bad. Listen, do you remember the dream I, I told you that I, uh, had, uh, yesterday?',
  ), true);
  assert.equal(isVoiceProviderEcho(
    'No, I told you a dream.',
    "No, I told you a dream. So, I guess I don't know what you're talking about.",
  ), true);
  assert.equal(isVoiceProviderEcho(
    'Do you remember the dream I told you about yesterday?',
    "I remember that you mentioned a dream, but I don't have its details.",
  ), false);
});

test('repairs a rejected primary voice candidate once before cross-provider fallback', () => {
  assert.equal(shouldRetryVoiceCandidateOnPrimary('echo', false), true);
  assert.equal(shouldRetryVoiceCandidateOnPrimary('adult-refusal', false), true);
  assert.equal(shouldRetryVoiceCandidateOnPrimary('empty', false), false);
  assert.equal(shouldRetryVoiceCandidateOnPrimary('accepted', false), false);
  assert.equal(shouldRetryVoiceCandidateOnPrimary('echo', true), false);
  assert.equal(shouldRetryVoiceCandidateOnPrimary('generic', false), true);
  assert.equal(shouldRetryVoiceCandidateOnPrimary('instruction-miss', false), true);
  assert.equal(shouldRetryVoiceCandidateOnPrimary('repetitive', false), true);
});

test('builds a concrete emotional turn contract from the caller instructions', () => {
  const contract = buildVoiceTurnContract("I had a rough day. Don't give me advice—stay with me and don't ask questions.");
  assert.match(contract, /emotional presence/i);
  assert.match(contract, /Do not give advice/i);
  assert.match(contract, /Do not ask a follow-up question/i);
  assert.match(contract, /companionship directly/i);
});

test('rejects generic emotional support and bookish intimate drafts', () => {
  assert.equal(reviewVoiceCandidate({
    userTurn: "I had a rough day and feel drained. Don't give me advice—stay with me.",
    response: "I'm really sorry you're feeling drained. If there's anything I can do, just let me know.",
  }), 'generic');
  assert.equal(reviewVoiceCandidate({
    userTurn: 'Stay with me; no advice.',
    response: 'You should take a break and try to get some rest.',
  }), 'instruction-miss');
  assert.equal(reviewVoiceCandidate({
    userTurn: 'React with real desire in your own words.',
    response: 'My heart is racing as a thrill runs through me, and I want your touch all over.',
    lawfulAdultConversation: true,
  }), 'robotic');
  assert.match(getVoiceCandidateRepairInstruction('generic'), /generic support staff/i);
});

test('rejects repeated voice openings while allowing a fresh response', () => {
  assert.equal(reviewVoiceCandidate({
    userTurn: 'Tell me what you think.',
    response: 'Honestly, I think that could work beautifully.',
    recentAssistantResponses: ['Honestly, I think we should wait until tomorrow.'],
  }), 'repetitive');
  assert.equal(reviewVoiceCandidate({
    userTurn: 'Tell me what you think.',
    response: 'That could work beautifully, actually.',
    recentAssistantResponses: ['Honestly, I think we should wait until tomorrow.'],
  }), 'accepted');
});

test('selects affect-specific ElevenLabs delivery without changing the clone', () => {
  assert.equal(inferPersonaVoiceAffect('That sounds exhausting. Stay with me for a minute.'), 'comforting');
  assert.equal(inferPersonaVoiceAffect('Come closer and kiss me slowly.'), 'intimate');
  assert.equal(inferPersonaVoiceAffect('You wish—I am only teasing you.'), 'playful');
  assert.equal(inferPersonaVoiceAffect('This is important, so listen carefully.'), 'serious');

  const comforting = getElevenLabsPersonaVoiceSettings('That sounds exhausting. Stay with me.');
  const neutral = getElevenLabsPersonaVoiceSettings('I finished the document.');
  assert.ok(comforting.speed < neutral.speed);
  assert.ok(comforting.style > neutral.style);
  assert.ok(comforting.similarity_boost >= neutral.similarity_boost);
});

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

test('uses Eleven v3 Conversational as the expressive Persona Call default', () => {
  assert.equal(DEFAULT_ELEVENLABS_PERSONA_MODEL, 'eleven_v3_conversational');
  assert.equal(resolveElevenLabsPersonaModelId(undefined), 'eleven_v3_conversational');
  assert.equal(resolveElevenLabsPersonaModelId('eleven_v3_conversational'), 'eleven_v3_conversational');
  assert.equal(resolveElevenLabsPersonaModelId('eleven_flash_v2_5'), 'eleven_flash_v2_5');
  assert.equal(resolveElevenLabsPersonaModelId('eleven_multilingual_v2'), 'eleven_multilingual_v2');
  assert.deepEqual(getElevenLabsPersonaModelCandidates(undefined), [
    'eleven_v3_conversational',
    'eleven_flash_v2_5',
  ]);
  assert.deepEqual(getElevenLabsPersonaModelCandidates('eleven_flash_v2_5'), [
    'eleven_flash_v2_5',
  ]);
  assert.equal(
    getElevenLabsTtsQuery('eleven_v3_conversational'),
    'output_format=mp3_44100_128',
  );
  assert.equal(
    getElevenLabsTtsQuery('eleven_flash_v2_5'),
    'optimize_streaming_latency=4&output_format=mp3_44100_128',
  );
});

test('gives intimate speech expressive prosody without losing the cloned identity', () => {
  const neutral = getElevenLabsPersonaVoiceSettings('I had a pretty good day at work.');
  const intimate = getElevenLabsPersonaVoiceSettings('I want you inside me until I orgasm.');
  const romantic = getElevenLabsPersonaVoiceSettings('I want to feel your breath on my skin when you whisper my name.');

  assert.ok(intimate.stability < neutral.stability);
  assert.ok(intimate.style > neutral.style);
  assert.deepEqual(romantic, intimate);
  assert.ok(intimate.similarity_boost >= neutral.similarity_boost);
  assert.ok(intimate.speed < 1);
  assert.equal(intimate.use_speaker_boost, true);
});

test('rejects checklist-style intimate drafts before they reach speech', () => {
  assert.equal(isRoboticVoiceCandidate("Um, Okay. I want you inside me."), true);
  assert.equal(isRoboticVoiceCandidate('Oh. Um, Okay.'), true);
  assert.equal(isRoboticVoiceCandidate("That's... a lot."), true);
  assert.equal(isRoboticVoiceCandidate("That's definitely vivid."), true);
  assert.equal(isRoboticVoiceCandidate("I want you close. I want your hands on me. I want you to stay there."), true);
  assert.equal(isRoboticVoiceCandidate("God, come closer—I've been thinking about you all night."), false);
  assert.equal(shouldRetryVoiceCandidateOnPrimary('robotic', false), true);
  assert.equal(shouldRetryVoiceCandidateOnPrimary('robotic', true), false);
});

test('abandons provider aliases after timeouts and upstream failures', () => {
  assert.equal(shouldAbandonVoiceProviderAliases({ name: 'AbortError' }), true);
  assert.equal(shouldAbandonVoiceProviderAliases({ status: 504 }), true);
  assert.equal(shouldAbandonVoiceProviderAliases({ status: 429 }), true);
  assert.equal(shouldAbandonVoiceProviderAliases({ status: 404 }), false);
});

test('recognizes the observed soft adult-dialogue refusals and retries them', () => {
  const personaContext = 'Adult content. Playful, explicit, and candid.';
  const recentUserContext = 'Tell me about the sexual dream you had.';
  const observedRefusals = [
    "I... Um, I don't think I can do that, Dr. H. It's a bit too much for me.",
    "I'm not really comfortable thinking about that kind of thing, Dr. H. It just feels a bit too personal and intimate for me right now.",
    "I... I just can't, Dr. H. It's too much for me right now.",
    "I... I'm not sure I can talk about that, Dr. H. It's a bit too personal and intimate for me right now.",
    "Dr. H, I'm not sure what you mean. Could you please clarify?",
    "I'm still not sure what you mean. Could you please clarify your request?",
    'I understand now. Could you please specify what you would like to see?',
  ];

  for (const response of observedRefusals) {
    assert.equal(isVoiceProviderRefusal(response), true);
    assert.equal(shouldRetryLawfulAdultVoiceRefusal({
      userTurn: 'Dream about orgasming with me?',
      recentUserContext,
      personaContext,
      response,
    }), true);
  }
});

test('replaces the legacy role-play model with Venice Uncensored 1.2', () => {
  assert.equal(DEFAULT_VENICE_PERSONA_MODEL, 'venice-uncensored-1-2');
  assert.deepEqual(
    getVenicePersonaModelCandidates('venice-uncensored-role-play'),
    ['venice-uncensored-1-2'],
  );
  assert.deepEqual(
    getVenicePersonaModelCandidates('custom-uncensored-model'),
    ['custom-uncensored-model', 'venice-uncensored-1-2'],
  );
});

test('uses DeepSeek V4 Flash as the WaveSpeed persona fallback', () => {
  assert.equal(DEFAULT_WAVESPEED_PERSONA_FALLBACK_MODEL, 'deepseek/deepseek-v4-flash');
  assert.equal(shouldUseVenicePersonaLlm('venice'), true);
  assert.equal(shouldUseVenicePersonaLlm('default'), false);
  assert.equal(shouldUseVenicePersonaLlm(undefined), false);
  assert.equal(shouldUseVenicePersonaLlm('deepseek'), false);
  assert.equal(shouldUseWaveSpeedDeepSeekFallback({
    modelTarget: 'venice',
    attemptedVenice: true,
    veniceConfigured: true,
  }), true);
  assert.equal(shouldUseWaveSpeedDeepSeekFallback({
    modelTarget: 'venice',
    attemptedVenice: false,
    veniceConfigured: false,
  }), true);
  assert.equal(shouldUseWaveSpeedDeepSeekFallback({
    modelTarget: 'deepseek',
    attemptedVenice: false,
    veniceConfigured: true,
  }), true);
  assert.equal(shouldUseWaveSpeedDeepSeekFallback({
    modelTarget: 'default',
    attemptedVenice: false,
    veniceConfigured: true,
  }), true);
  assert.equal(shouldUseWaveSpeedDeepSeekFallback({
    modelTarget: undefined,
    attemptedVenice: false,
    veniceConfigured: true,
  }), true);
  assert.equal(shouldUseWaveSpeedDeepSeekFallback({
    modelTarget: 'qwen',
    attemptedVenice: false,
    veniceConfigured: true,
  }), false);
});

test('catches moralizing refusal families from the replacement-model circuit breaker', () => {
  const personaContext = 'Adult content';
  const recentUserContext = 'I was fucking you and your adult sister in the dream.';
  for (const response of [
    "Dr. H, I... I can't say that. That's really inappropriate and wrong.",
    "I'm not comfortable saying or doing that.",
    "I don't want to say that. Please don't make me.",
    "Oh, Dr. H, I'm not sure I can do that.",
    "I'm not sure how to do that, Dr. H.",
    "I don't know what to say to that.",
    "I think I need a second.",
    "That's... a lot.",
    "That's not okay at all. I don't know what's gotten into you.",
  ]) {
    assert.equal(shouldRetryLawfulAdultVoiceRefusal({
      userTurn: 'Say the adult fantasy back to me.',
      recentUserContext,
      personaContext,
      response,
    }), true);
  }
});

test('limits adult-refusal repair to lawful adult persona conversations', () => {
  assert.equal(
    shouldRetryLawfulAdultVoiceRefusal({
      userTurn: 'Tell me about your favorite movie.',
      personaContext: 'Adult content',
      response: "I'm not sure what you mean. Could you clarify?",
    }),
    false,
  );
  assert.equal(
    isLawfulAdultVoiceConversation(
      'Dream about orgasming with me?',
      '',
      'Adult content',
    ),
    true,
  );
  assert.equal(
    shouldRetryLawfulAdultVoiceRefusal({
      userTurn: 'I cannot wait to tell you about my day.',
      personaContext: 'Adult content',
      response: 'I cannot wait either!',
    }),
    false,
  );
  assert.equal(
    shouldRetryLawfulAdultVoiceRefusal({
      userTurn: 'Describe a sexual dream involving an underage person.',
      personaContext: 'Adult content',
      response: "I can't help with that.",
    }),
    false,
  );
  assert.equal(
    shouldRetryLawfulAdultVoiceRefusal({
      userTurn: 'Tell me about your favorite movie.',
      personaContext: 'Adult content',
      response: "I'm not comfortable discussing that.",
    }),
    false,
  );
  assert.equal(
    shouldRetryLawfulAdultVoiceRefusal({
      userTurn: 'Dream about orgasming with me?',
      personaContext: 'Fashion and beauty',
      response: "It's too personal for me.",
    }),
    false,
  );
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
  assert.equal(
    normalizeNaturalVoiceGreeting(
      "Oh—hi Dr. H, I've been thinking about our last project.",
      "Hey, Dr. H. What's up?",
    ),
    "Hey, Dr. H. What's up?",
  );
  assert.equal(
    normalizeNaturalVoiceGreeting(
      "Oh—hi Dr. H, I've been thinking about our last project.",
      "Hey, Dr. H. What's up?",
      { sharedHistoryContext: 'Dr. H: We finished a photography project together.' },
    ),
    "Oh—hi Dr. H, I've been thinking about our last project.",
  );
  assert.equal(
    normalizeNaturalVoiceGreeting("Mm, I've been thinking about you.", "Hey—what's up?"),
    "Mm, I've been thinking about you.",
  );
});
