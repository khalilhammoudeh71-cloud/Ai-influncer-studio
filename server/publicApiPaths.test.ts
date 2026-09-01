import assert from 'node:assert/strict';
import test from 'node:test';
import { isPublicApiPath } from './publicApiPaths';

test('lets Vercel cron reach the durable media recovery worker', () => {
  assert.equal(isPublicApiPath('/media-jobs/worker'), true);
  assert.equal(isPublicApiPath('/api/media-jobs/worker'), true);
});

test('keeps ordinary app routes behind authentication', () => {
  assert.equal(isPublicApiPath('/media-jobs'), false);
  assert.equal(isPublicApiPath('/personas'), false);
  assert.equal(isPublicApiPath('/agent/voice-chat'), false);
});
