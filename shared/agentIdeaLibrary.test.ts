import test from 'node:test';
import assert from 'node:assert/strict';
import { ideaFeedbackContext, ideaKey, readIdeaLibrary, rememberIdea, remixIdeaBrief } from './agentIdeaLibrary';
const idea = { title: 'The delayed flight', opening: 'The gate closes.', payoff: 'The tooth wakes up.', shareReason: 'Travel partners recognize this.' };

test('feedback survives a round trip, updates one pitch, and forget removes it', () => {
  const saved = rememberIdea([], idea, 'saved');
  const passed = rememberIdea(readIdeaLibrary(JSON.parse(JSON.stringify(saved))), idea, 'passed', 'Already done');
  assert.equal(rememberIdea(saved, idea, 'built')[0].saved, true);
  assert.equal(passed[0].saved, false);
  assert.equal(passed.length, 1);
  assert.equal(passed[0].status, 'passed');
  assert.equal(passed[0].reason, 'Already done');
  assert.deepEqual(passed.filter(entry => ideaKey(entry.idea) !== ideaKey(idea)), []);
  // A new opening and payoff under the same title are a distinct pitch.
  assert.equal(rememberIdea(passed, { ...idea, payoff: 'The suitcase gets toothache.' }, 'saved').length, 2);
});

test('malformed feedback is discarded and both stored history and prompt context are bounded', () => {
  assert.deepEqual(readIdeaLibrary({ status: 'saved' }), []);
  assert.deepEqual(readIdeaLibrary([null, { idea, status: 'published', updatedAt: 1 }, { idea: { ...idea, title: 3 }, status: 'saved', updatedAt: 1 }]), []);
  const many = Array.from({ length: 220 }, (_, i) => ({ idea: { ...idea, title: `Pitch ${i}` }, status: 'saved', updatedAt: i }));
  assert.equal(readIdeaLibrary(many).length, 200);
  const context = ideaFeedbackContext(many);
  assert.match(context, /Pitch 39/);
  assert.doesNotMatch(context, /Pitch 40/);
  assert.equal(ideaFeedbackContext(undefined), '');
});

test('feedback preserves rejection reasons without treating saved or built ideas as results', () => {
  const context = ideaFeedbackContext(rememberIdea([], idea, 'passed', 'Too hard to make'));
  assert.match(context, /Too hard to make/);
  assert.match(context, /not generated or published/);
  assert.match(context, /not infer measured virality/);
  const remix = remixIdeaBrief(idea, 'Film alone');
  assert.match(remix, /Film alone/);
  assert.match(remix, /four fresh alternatives/);
  assert.match(remix, /change the opening, narrative mechanism and payoff/);
});
