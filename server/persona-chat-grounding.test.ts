import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detectIncompletePersonaMediaRequest,
  detectExplicitPersonaMediaRequest,
  resolvePersonaChatIdentity,
  resolvePersonaMediaRequest,
  sanitizePersonaSelfAddress,
} from './persona-chat-grounding';

const leen = { id: 'leen', name: 'Leen Hassan', referenceImage: 'leen.jpg' };
const rawan = { id: 'rawan', name: 'Rawan Hassan', referenceImage: 'rawan.jpg' };
const drH = { id: 'dr-h', name: 'Dr. H', referenceImage: 'dr-h.jpg', isCreator: true };

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

test('a generic creation request asks for details instead of starting an arbitrary job', () => {
  assert.equal(
    detectIncompletePersonaMediaRequest('Listen, I need you to, to generate an image for me.'),
    'image',
  );
  assert.equal(detectExplicitPersonaMediaRequest('Generate an image for me.'), undefined);
  assert.equal(detectIncompletePersonaMediaRequest('Generate an image of me standing by the window.'), undefined);
  assert.equal(detectExplicitPersonaMediaRequest('Generate an image of me standing by the window.')?.type, 'image');
});

test('the immediate answer to an image clarification becomes the generation prompt', () => {
  const currentTurn = 'Okay. Uh, of me standing up and you are kneeling down on your knees and sucking my dick while looking at the camera.';
  const action = resolvePersonaMediaRequest(currentTurn, [
    { role: 'user', type: 'text', content: 'Listen, I need you to, to generate an image for me.' },
    { role: 'persona', type: 'text', content: 'What kind of image would you like me to make?' },
    { role: 'user', type: 'text', content: currentTurn },
  ]);

  assert.deepEqual(action, { type: 'image', prompt: currentTurn });
});

test('an older clarification cannot revive a stale media request', () => {
  assert.equal(resolvePersonaMediaRequest('Standing by the window at sunset.', [
    { role: 'persona', type: 'text', content: 'What kind of image would you like me to make?' },
    { role: 'user', type: 'text', content: 'Never mind, how was your day?' },
    { role: 'persona', type: 'text', content: 'Busy, but good.' },
  ]), undefined);
});
