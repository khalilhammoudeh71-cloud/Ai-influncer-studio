import test from 'node:test';
import assert from 'node:assert/strict';
import { CallTranscript } from './callTranscript';

test('provisional speech stays out of committed history and duplicate finals commit once', () => {
  const committed: any[] = [], previews: any[] = [];
  const transcript = new CallTranscript(m => committed.push(m), m => previews.push(m), 'call');
  transcript.receive('reply', 'model', 'We can', false);
  transcript.receive('reply', 'model', 'We could', false);
  assert.equal(committed.length, 0);
  assert.equal(previews.at(-1).content, 'We could');
  transcript.receive('reply', 'model', 'We could try tomorrow.');
  transcript.receive('reply', 'model', 'We could try tomorrow.');
  assert.equal(committed.length, 1);
  assert.equal(committed[0].content, 'We could try tomorrow.');
});

test('interruptions preserve one turn and delayed finals cannot erase delivery uncertainty', () => {
  const committed: any[] = [];
  const transcript = new CallTranscript(m => committed.push(m), undefined, 'call');
  transcript.receive('reply', 'model', 'We can visit the museum', false);
  transcript.interrupt();
  transcript.receive('reply', 'model', 'We can visit the museum tomorrow.');
  assert.equal(new Set(committed.map(m => m.id)).size, 1);
  assert.match(committed.at(-1).content, /interrupted/);
  transcript.correct('reply', 'We can visit');
  assert.doesNotMatch(committed.at(-1).content, /museum|tomorrow/);
  assert.match(committed.at(-1).content, /interrupted/);
});

test('finishing playback protects earlier turns, and provider IDs cannot collide across calls or roles', () => {
  const committed: any[] = [];
  const transcript = new CallTranscript(m => committed.push(m), undefined, 'a');
  transcript.receive('same', 'model', 'Done.');
  transcript.finish();
  transcript.receive('same', 'user', 'Thanks.');
  transcript.interrupt();
  const other = new CallTranscript(m => committed.push(m), undefined, 'b');
  other.receive('same', 'model', 'Done.');
  assert.equal(committed.length, 3);
  assert.equal(new Set(committed.map(m => m.id)).size, 3);
  assert.ok(committed.every(m => !m.content.includes('interrupted')));
});
