import assert from 'node:assert/strict';
import test from 'node:test';
import { isCloneMediaFile, isCloneVideoFile, shouldNormalizeCloneMedia } from './audioUtils';

test('clone media policy accepts audio and video MIME types and extensions', () => {
  assert.equal(isCloneMediaFile({ type: 'audio/mpeg', name: 'voice.mp3' }), true);
  assert.equal(isCloneMediaFile({ type: 'video/mp4', name: 'clip.mp4' }), true);
  assert.equal(isCloneMediaFile({ type: '', name: 'camera.MOV' }), true);
  assert.equal(isCloneMediaFile({ type: 'image/png', name: 'portrait.png' }), false);
  assert.equal(isCloneVideoFile({ type: 'video/quicktime', name: 'clip.mov' }), true);
  assert.equal(isCloneVideoFile({ type: 'audio/mpeg', name: 'clip.mp4' }), true);
  assert.equal(isCloneVideoFile({ type: 'audio/mpeg', name: 'voice.mp3' }), false);
});

test('only video or oversized audio needs browser extraction', () => {
  assert.equal(shouldNormalizeCloneMedia({ type: 'video/mp4', name: 'clip.mp4', size: 1200 }), true);
  assert.equal(shouldNormalizeCloneMedia({ type: 'audio/mpeg', name: 'voice.mp3', size: 20 * 1024 * 1024 }), false);
  assert.equal(shouldNormalizeCloneMedia({ type: 'audio/mpeg', name: 'voice.mp3', size: 20 * 1024 * 1024 + 1 }), true);
});
