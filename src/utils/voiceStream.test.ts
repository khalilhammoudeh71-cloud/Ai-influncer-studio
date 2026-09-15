import assert from 'node:assert/strict';
import test from 'node:test';
import { readVoiceTextStream, VoiceTurnScope } from './voiceStream';

function byteStream(text: string) {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({ start(controller) {
    for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
    controller.close();
  }});
}

test('preserves split UTF-8 and SSE frames without duplicating text', async () => {
  const text: string[] = [];
  await readVoiceTextStream(byteStream('data: {"text":"Hello."}\r\n\r\ndata: {"text":"مرحبا"}\n\ndata: {"done":true}\n\n'), t => text.push(t), new AbortController().signal);
  assert.deepEqual(text, ['Hello.', 'مرحبا']);
});

test('surfaces provider errors instead of swallowing them as malformed JSON', async () => {
  await assert.rejects(readVoiceTextStream(byteStream('data: {"error":"fixture unavailable"}\n\n'), () => {}, new AbortController().signal), /fixture unavailable/);
});

test('done terminates text delivery and cancels unread content', async () => {
  const text: string[] = [];
  await readVoiceTextStream(byteStream('data: {"done":true}\n\ndata: {"text":"stale"}\n\n'), t => text.push(t), new AbortController().signal);
  assert.deepEqual(text, []);
});

test('cancellation closes a pending reader without delivering late speech', async () => {
  let cancelled = false;
  const controller = new AbortController();
  const stream = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  const pending = readVoiceTextStream(stream, () => assert.fail('late text'), controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(cancelled, true);
});

test('a replacement turn invalidates old callbacks and aborts old requests', () => {
  const scope = new VoiceTurnScope();
  const old = scope.start();
  const current = scope.start();
  assert.equal(old.isCurrent(), false);
  assert.equal(old.signal.aborted, true);
  assert.equal(current.isCurrent(), true);
  scope.cancel();
  assert.equal(current.isCurrent(), false);
  assert.equal(current.signal.aborted, true);
});
