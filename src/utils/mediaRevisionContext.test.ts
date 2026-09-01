import assert from 'node:assert/strict';
import test from 'node:test';
import { findLatestGeneratedImage, isImageRevisionRequest, resolveImageRevisionContext } from './mediaRevisionContext';

const originalImage = {
  id: 'image-1',
  role: 'persona',
  type: 'image',
  content: 'https://example.com/original.png',
  prompt: 'Rawan Hassan, Leen Hassan, and Dr. H posing together on a beach',
  participants: ['Rawan Hassan', 'Leen Hassan', 'Dr. H'],
};

test('finds the most recent persona-generated image', () => {
  assert.equal(findLatestGeneratedImage([
    originalImage,
    { id: 'text-1', role: 'persona', type: 'text', content: 'Done' },
    { ...originalImage, id: 'image-2', content: 'https://example.com/latest.png' },
  ])?.id, 'image-2');
});

test('recognizes natural image revision instructions only when an image exists', () => {
  assert.equal(isImageRevisionRequest('make the dress red', true), true);
  assert.equal(isImageRevisionRequest('give me another image, replicating the exact faces', true), true);
  assert.equal(isImageRevisionRequest('keep everything but change the background', true), true);
  assert.equal(isImageRevisionRequest('make the dress red', false), false);
  assert.equal(isImageRevisionRequest('generate a completely new image at the gym', true), false);
});

test('does not reinterpret ordinary conversation as an old image revision', () => {
  assert.equal(isImageRevisionRequest('What would you change next time?', true), false);
  assert.equal(isImageRevisionRequest('How did your plans change after school?', true), false);
  assert.equal(isImageRevisionRequest('I tried baking another cake today.', true), false);
  assert.equal(
    resolveImageRevisionContext('Blue. What went wrong with the cake, and what would you change next time?', [originalImage]).isRevision,
    false,
  );
});

test('keeps direct and polite image edit commands working', () => {
  assert.equal(isImageRevisionRequest('change the dresses to gold', true), true);
  assert.equal(isImageRevisionRequest('Could you change the background to sunset?', true), true);
  assert.equal(isImageRevisionRequest('make the lighting warmer', true), true);
  assert.equal(isImageRevisionRequest('Please remove the person on the left', true), true);
});

test('combines the original request with the latest modification', () => {
  const context = resolveImageRevisionContext('change the dresses to gold', [originalImage]);

  assert.equal(context.isRevision, true);
  assert.equal(context.source?.content, originalImage.content);
  assert.equal(context.rootPrompt, originalImage.prompt);
  assert.deepEqual(context.revisionHistory, ['change the dresses to gold']);
  assert.match(context.prompt, /Rawan Hassan, Leen Hassan, and Dr\. H posing together on a beach/);
  assert.match(context.prompt, /change the dresses to gold/);
  assert.match(context.prompt, /Preserve every person, identity, face, pose, composition/);
});

test('keeps a stable root prompt across several revisions', () => {
  const firstRevision = resolveImageRevisionContext('change the dresses to gold', [originalImage]);
  const revisedImage = {
    ...originalImage,
    id: 'image-2',
    content: 'https://example.com/revised.png',
    prompt: firstRevision.prompt,
    rootPrompt: firstRevision.rootPrompt,
    revisionHistory: firstRevision.revisionHistory,
  };
  const secondRevision = resolveImageRevisionContext('make the lighting warmer', [originalImage, revisedImage]);

  assert.equal(secondRevision.rootPrompt, originalImage.prompt);
  assert.deepEqual(secondRevision.revisionHistory, [
    'change the dresses to gold',
    'make the lighting warmer',
  ]);
  assert.equal(secondRevision.prompt.match(/Original image request:/g)?.length, 1);
});

test('uses a specifically pasted generated image instead of the newest image', () => {
  const newerImage = {
    ...originalImage,
    id: 'image-newer',
    content: 'https://example.com/newer.png',
    prompt: 'Rawan alone at the gym',
  };
  const context = resolveImageRevisionContext(
    'change only the background to sunset',
    [originalImage, newerImage],
    originalImage,
  );

  assert.equal(context.source?.id, originalImage.id);
  assert.equal(context.rootPrompt, originalImage.prompt);
  assert.doesNotMatch(context.prompt, /Rawan alone at the gym/);
});
