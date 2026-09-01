import assert from 'node:assert/strict';
import test from 'node:test';
import { requestedExactReply } from './agentReplyConstraints';

test('returns a valid exact word-count reply without a model preamble', () => {
  assert.equal(requestedExactReply('Reply with exactly two words: Agent fast.'), 'Agent fast.');
});

test('removes matching quote wrappers from an exact reply', () => {
  assert.equal(requestedExactReply('Please respond exactly: “Ready now.”'), 'Ready now.');
});

test('ignores malformed word-count and ordinary prompts', () => {
  assert.equal(requestedExactReply('Reply with exactly two words: This has three.'), null);
  assert.equal(requestedExactReply('Tell me how the agent works.'), null);
});
