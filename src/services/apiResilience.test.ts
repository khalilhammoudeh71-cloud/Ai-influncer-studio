import test from 'node:test';
import assert from 'node:assert/strict';
import { apiRetryDelayMs, shouldRetryApiRequest } from './apiResilience';

test('retries one transient idempotent API request', () => {
  assert.equal(shouldRetryApiRequest({ method: 'GET', attempt: 0, networkError: true }), true);
  assert.equal(shouldRetryApiRequest({ method: 'PUT', attempt: 0, status: 401 }), true);
  assert.equal(shouldRetryApiRequest({ method: 'DELETE', attempt: 0, status: 503 }), true);
  assert.equal(shouldRetryApiRequest({ method: 'GET', attempt: 1, status: 503 }), false);
});

test('does not automatically replay non-idempotent generation requests', () => {
  assert.equal(shouldRetryApiRequest({ method: 'POST', attempt: 0, networkError: true }), false);
  assert.equal(shouldRetryApiRequest({ method: 'POST', attempt: 0, status: 401 }), false);
});

test('caps API retry backoff', () => {
  assert.equal(apiRetryDelayMs(0), 220);
  assert.equal(apiRetryDelayMs(20), 1500);
});
