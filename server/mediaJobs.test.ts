import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fallbackModelForJob,
  isMediaJobStale,
  isRetryableMediaJobFailure,
  publicMediaJob,
  summarizeMediaJobRequest,
} from './mediaJobs';

test('summarizes media requests without exposing stored binary inputs', () => {
  assert.equal(summarizeMediaJobRequest({ prompt: 'A beach portrait', sourceImage: 'data:image/png;base64,secret' }), 'A beach portrait');
});

test('allows transient provider failures to use a fallback but not policy or billing failures', () => {
  assert.equal(isRetryableMediaJobFailure(504, 'Provider timed out'), true);
  assert.equal(isRetryableMediaJobFailure(429, 'Busy'), true);
  assert.equal(isRetryableMediaJobFailure(403, 'Insufficient credits'), false);
  assert.equal(isRetryableMediaJobFailure(500, 'Content filter rejected request'), false);
});

test('chooses a different configured fallback for image, video, edit, and upscale jobs', () => {
  assert.match(fallbackModelForJob('image', 'wavespeed:bytedance/seedream-v5.0-pro') || '', /qwen-3\.0-pro/);
  assert.match(fallbackModelForJob('video', 'wavespeed-i2v:bytedance/seedance-2-mini') || '', /wan-2\.2/);
  assert.match(fallbackModelForJob('edit', 'wavespeed-edit:bytedance/seedream-v5.0-pro/edit') || '', /qwen-3\.0-pro/);
  assert.equal(fallbackModelForJob('upscale', 'wavespeed-upscale:topaz'), 'runware:upscale');
  assert.equal(fallbackModelForJob('upscale', 'runware:upscale'), null);
  assert.equal(fallbackModelForJob('avatar', 'wavespeed-ai/ai-talking-photos'), null);
});

test('presents abandoned running work as recoverable instead of permanently running', () => {
  const old = new Date(Date.now() - 13 * 60 * 1000);
  assert.equal(isMediaJobStale(old), true);
  const job = publicMediaJob({
    id: 'job-1',
    kind: 'video',
    status: 'running',
    request: JSON.stringify({ prompt: 'Walk on the beach', sourceImage: 'private-data' }),
    createdAt: old,
    updatedAt: old,
  });
  assert.equal(job.status, 'failed');
  assert.equal(job.isStale, true);
  assert.equal(job.summary, 'Walk on the beach');
  assert.match(job.error || '', /interrupted/i);
});
