import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detectIncompletePersonaMediaRequest,
  detectExplicitPersonaMediaRequest,
  hasDistinctRequestedCreatorIdentity,
  resolvePersonaChatIdentity,
  resolvePersonaMediaRequest,
  sanitizePersonaSelfAddress,
} from './persona-chat-grounding';

const leen = { id: 'leen', name: 'Leen Hassan', referenceImage: 'leen.jpg' };
const rawan = { id: 'rawan', name: 'Rawan Hassan', referenceImage: 'rawan.jpg' };
const drH = { id: 'dr-h', name: 'Dr. H', referenceImage: 'dr-h.jpg', isCreator: true };

test('uses a distinct requested creator for the low-latency voice identity path', () => {
  assert.equal(hasDistinctRequestedCreatorIdentity({
    activePersona: leen,
    requestedCreator: { name: 'Dr. H' },
  }), true);
  assert.equal(hasDistinctRequestedCreatorIdentity({
    activePersona: leen,
    requestedCreator: { name: 'Leen Hasan' },
  }), false);
  assert.equal(hasDistinctRequestedCreatorIdentity({
    activePersona: leen,
    requestedUserName: '',
  }), false);
});

test('a saved creator persona overrides a stale client profile named after the active persona', () => {
  const identity = resolvePersonaChatIdentity({
    activePersona: leen,
    requestedCreator: { name: 'Leen Hassan' },
    storedCreator: { name: 'Leen Hassan' },
    savedPersonas: [leen, rawan, drH],
  });

  assert.equal(identity.creatorName, 'Dr. H');
  assert.equal(identity.creatorProfile.ownerPersonaId, 'dr-h');
  assert.equal(identity.creatorProfile.primaryPhoto, 'dr-h.jpg');
});

test('the active persona can never become its own fallback creator identity', () => {
  const identity = resolvePersonaChatIdentity({
    activePersona: leen,
    requestedCreator: { name: 'Leen' },
    storedCreator: null,
    savedPersonas: [leen],
    requestedUserName: 'Leen Hassan',
  });

  assert.equal(identity.creatorName, 'Creator');
});

test('repairs only a leading persona self-name used as the creator address', () => {
  assert.equal(
    sanitizePersonaSelfAddress("Leen, I... I'm sorry.", 'Leen Hassan', 'Dr. H'),
    "Dr. H, I... I'm sorry.",
  );
  assert.equal(
    sanitizePersonaSelfAddress('Hey, Leen—are you okay?', 'Leen Hassan', 'Dr. H'),
    'Hey, Dr. H, are you okay?',
  );
  assert.equal(
    sanitizePersonaSelfAddress('I am Leen, and I remember that.', 'Leen Hassan', 'Dr. H'),
    'I am Leen, and I remember that.',
  );
  assert.equal(
    sanitizePersonaSelfAddress('I understand, Leen. We can slow down.', 'Leen Hassan', 'Dr. H'),
    'I understand, Dr. H. We can slow down.',
  );
  assert.equal(
    sanitizePersonaSelfAddress('That makes sense. Leen, tell me more.', 'Leen Hassan', 'Dr. H'),
    'That makes sense. Dr. H, tell me more.',
  );
});

test('detects a requested naked profile image without requiring a generate verb', () => {
  assert.deepEqual(
    detectExplicitPersonaMediaRequest('I want a naked profile image.'),
    { type: 'image', prompt: 'I want a naked profile image.' },
  );
});

test('detects direct video requests while leaving media discussion as chat', () => {
  assert.equal(detectExplicitPersonaMediaRequest('Could I get a short video of you walking?')?.type, 'video');
  assert.equal(detectExplicitPersonaMediaRequest("I don't want another image. Let's just talk."), undefined);
  assert.equal(detectExplicitPersonaMediaRequest('Why did you send that photo?'), undefined);
});

test('keeps relational requests to see the persona in conversation', () => {
  for (const request of [
    'I wanna see you.',
    'I want to see you as soon as possible.',
    'I said I wanna see you so that I can fuck you.',
    'Let me see you.',
    'Show me your body.',
    'Show me your outfit.',
    'Send it.',
    'Send another one.',
    'Can I see you tonight?',
  ]) {
    assert.equal(detectIncompletePersonaMediaRequest(request), undefined, request);
    assert.equal(detectExplicitPersonaMediaRequest(request), undefined, request);
    assert.equal(resolvePersonaMediaRequest(request), undefined, request);
  }
});

test('a generic creation request asks for details instead of starting an arbitrary job', () => {
  const vagueRequests = [
    'Listen, I need you to, to generate an image for me.',
    'Generate an image for me.',
    'Send me an image.',
    'I want an image of u.',
    "I'd love to see an image.",
    'Could I see a photo of you?',
  ];
  for (const request of vagueRequests) {
    assert.equal(detectIncompletePersonaMediaRequest(request), 'image', request);
    assert.equal(detectExplicitPersonaMediaRequest(request), undefined, request);
  }

  assert.equal(detectIncompletePersonaMediaRequest('Generate an image of me standing by the window.'), undefined);
  assert.equal(detectExplicitPersonaMediaRequest('Generate an image of me standing by the window.')?.type, 'image');
  assert.equal(detectIncompletePersonaMediaRequest('Send me an image of you in a red dress at the beach.'), undefined);
  assert.equal(detectExplicitPersonaMediaRequest('Send me an image of you in a red dress at the beach.')?.type, 'image');
  assert.equal(detectIncompletePersonaMediaRequest("I'd love to see an explicit nude image of you in the bedroom."), undefined);
  assert.equal(detectExplicitPersonaMediaRequest("I'd love to see an explicit nude image of you in the bedroom.")?.type, 'image');
});

test('the immediate answer to an image clarification becomes the generation prompt', () => {
  const currentTurn = 'Okay. Uh, of me standing up and you are kneeling down on your knees and sucking my dick while looking at the camera.';
  const action = resolvePersonaMediaRequest(currentTurn, [
    { role: 'user', type: 'text', content: 'Listen, I need you to, to generate an image for me.' },
    { role: 'persona', type: 'text', content: 'What kind of image would you like me to make?' },
    { role: 'user', type: 'text', content: currentTurn },
  ]);

  assert.deepEqual(action, { type: 'image', prompt: currentTurn });

  assert.deepEqual(resolvePersonaMediaRequest('A waist-up portrait of you wearing a red jacket outdoors in daylight.', [
    { role: 'persona', type: 'text', content: 'What kind of image would you like me to make?' },
  ]), {
    type: 'image',
    prompt: 'A waist-up portrait of you wearing a red jacket outdoors in daylight.',
  });
});

test('an unrelated answer does not become an image prompt after clarification', () => {
  const clarification = { role: 'persona', type: 'text', content: 'What kind of image would you like me to make?' };

  assert.equal(resolvePersonaMediaRequest("Quick check: what's your name, and what's my name?", [clarification]), undefined);
  assert.equal(resolvePersonaMediaRequest('Actually, never mind. Tell me about your day.', [clarification]), undefined);
  assert.equal(resolvePersonaMediaRequest("I don't want one anymore. Let's just talk about the weather.", [clarification]), undefined);
  assert.equal(resolvePersonaMediaRequest('Blue.', [clarification]), undefined);
});

test('an older clarification cannot revive a stale media request', () => {
  assert.equal(resolvePersonaMediaRequest('Standing by the window at sunset.', [
    { role: 'persona', type: 'text', content: 'What kind of image would you like me to make?' },
    { role: 'user', type: 'text', content: 'Never mind, how was your day?' },
    { role: 'persona', type: 'text', content: 'Busy, but good.' },
  ]), undefined);
});
