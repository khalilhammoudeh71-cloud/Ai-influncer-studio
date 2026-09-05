import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detectExplicitMediaCreationRequest,
  detectIncompleteMediaCreationRequest,
  isConversationalMediaCreationRemark,
  resolveExecutableMediaCreationRequest,
} from './personaMediaIntent';

test('does not treat relational language as a media command', () => {
  for (const prompt of [
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
    assert.equal(detectExplicitMediaCreationRequest(prompt), undefined, prompt);
    assert.equal(detectIncompleteMediaCreationRequest(prompt), undefined, prompt);
  }
});

test('keeps media discussion and negation out of generation', () => {
  for (const prompt of [
    "I don't want a photo.",
    "Don't send me a photo.",
    'Why did you send that image?',
    "I didn't ask for a video.",
    "Never mind, let's just talk.",
  ]) {
    assert.equal(isConversationalMediaCreationRemark(prompt), true, prompt);
    assert.equal(detectExplicitMediaCreationRequest(prompt), undefined, prompt);
    assert.equal(detectIncompleteMediaCreationRequest(prompt), undefined, prompt);
  }
});

test('requires a named media asset and usable generation details', () => {
  assert.equal(
    detectExplicitMediaCreationRequest('Send me a photo of you wearing a red dress by the window.'),
    'image',
  );
  assert.equal(
    detectExplicitMediaCreationRequest('Create a short video of you walking on the beach.'),
    'video',
  );
  assert.equal(
    detectExplicitMediaCreationRequest('Generate a fully nude, photorealistic image of you lying on a bed, clearly an adult, looking at the camera.'),
    'image',
  );
  assert.equal(detectIncompleteMediaCreationRequest('Send me an image.'), 'image');
  assert.equal(detectExplicitMediaCreationRequest('Send me an image.'), undefined);
});

test('only authorizes media execution from deterministic user intent', () => {
  assert.equal(resolveExecutableMediaCreationRequest('I want to see you.'), undefined);
  assert.equal(resolveExecutableMediaCreationRequest('Send me an image.'), undefined);
  assert.equal(
    resolveExecutableMediaCreationRequest('Send me a photo of you wearing a red dress by the window.'),
    'image',
  );
  assert.equal(
    resolveExecutableMediaCreationRequest('Make it brighter.', { hasImageRevision: true }),
    'image',
  );
  assert.equal(
    resolveExecutableMediaCreationRequest("Don't send another image.", { hasImageRevision: true }),
    undefined,
  );
});
