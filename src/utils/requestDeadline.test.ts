import test from 'node:test';
import assert from 'node:assert/strict';
import { withDeadline } from './requestDeadline';
test('a stalled session fails explicitly instead of issuing an anonymous request', async () => {
  await assert.rejects(withDeadline(new Promise(() => {}), 'Session connection timed out', 5), /Session connection timed out/);
});
test('session results and original failures are retained', async () => {
  assert.equal(await withDeadline(Promise.resolve('authenticated'), 'timeout'), 'authenticated');
  await assert.rejects(withDeadline(Promise.reject(new Error('offline')), 'timeout'), /offline/);
});
