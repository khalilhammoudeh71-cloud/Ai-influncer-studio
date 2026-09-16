import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceFilterLabel } from './stockVoices';

test('equivalent provider metadata shares one filter option', () => {
  assert.equal(voiceFilterLabel('Upbeat'), voiceFilterLabel('upbeat'));
  assert.equal(voiceFilterLabel('  Mature  '), 'Mature');
  assert.equal(voiceFilterLabel(''), 'Not specified');
  assert.equal(voiceFilterLabel('Not specified'), 'Not specified');
});
