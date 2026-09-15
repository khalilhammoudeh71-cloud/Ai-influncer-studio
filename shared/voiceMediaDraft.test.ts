import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveVoiceMediaDraft } from './voiceMediaDraft';
import { buildVoiceConversationHistory } from './voiceConversationContext';

const user = (content: string) => ({ role: 'user', content });
const assistant = (content: string) => ({ role: 'model', content });
test('a description waits for permission rather than generating during a pause', () => {
  assert.equal(resolveVoiceMediaDraft('Generate a photo of you and me at a cafe.', []).status, 'waiting');
});
test('send that resolves the complete scene and later details without assistant inventions', () => {
  const result = resolveVoiceMediaDraft('Send me that image.', [
    user('I want an image of you and me at a cafe.'),
    assistant('We could add a helicopter.'),
    user('With blue jackets and morning light.'),
  ]);
  assert.equal(result.status, 'ready');
  assert.match(result.prompt || '', /you and me at a cafe/);
  assert.match(result.prompt || '', /blue jackets and morning light/);
  assert.doesNotMatch(result.prompt || '', /helicopter/);
});
test('cancellation and completed media prevent stale confirmations', () => {
  for (const boundary of [user('Never mind.'), { role: 'persona', type: 'image', content: 'asset' }]) {
    assert.notEqual(resolveVoiceMediaDraft('Send that.', [user('A photo of you and me at a cafe.'), boundary]).status, 'ready');
  }
});
test('a bare acknowledgement does not authorize a generation', () => {
  assert.notEqual(resolveVoiceMediaDraft('Yeah.', [user('Generate a photo of a cafe.')]).status, 'ready');
});
test('standalone confirmation without scene asks for details', () => {
  assert.equal(resolveVoiceMediaDraft('Now generate the image.', []).status, 'waiting');
});
test('an explicit final instruction can finish a description in one turn', () => {
  assert.equal(resolveVoiceMediaDraft('A photo of you and me in blue jackets at a cafe. Go ahead and make it.', []).status, 'ready');
});
test('yes only confirms an immediate draft confirmation question', () => {
  assert.equal(resolveVoiceMediaDraft('Yes.', [user('An image of you and me at a cafe.'), assistant('Anything else in the picture, or shall I make it?')]).status, 'ready');
});
test('video completion keeps the selected media kind', () => {
  assert.equal(resolveVoiceMediaDraft('A video of you walking at the beach. Go ahead and make it.', []).type, 'video');
});
test('call history retains a pending scene only for its immediate confirmation', () => {
  const history = [user('A photo of you and me at a cafe.'), assistant('Anything else in the picture, or shall I make it?'), user('Yes.')];
  const transmitted = buildVoiceConversationHistory(history, 'Yes.');
  assert.equal(resolveVoiceMediaDraft('Yes.', transmitted).status, 'ready');
});

test('a continuation remains pending without claiming generation', () => {
  const result = resolveVoiceMediaDraft('With blue jackets and morning light.', [user('I want an image of you and me sitting at a cafe.'), assistant('Anything else you want in the picture, or shall I make it?')]);
  assert.equal(result.status, 'waiting');
  assert.match(result.prompt || '', /blue jackets/);
});
