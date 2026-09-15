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

test('cropVoiceReference bounds decoded audio and closes its context', async () => {
  const { cropVoiceReference } = await import('./audioUtils');
  const originals = Object.fromEntries(['AudioContext','OfflineAudioContext','FileReader','File','fetch'].map(key => [key, (globalThis as any)[key]]));
  let frames = 0;
  let closed = false;
  (globalThis as any).fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
  (globalThis as any).AudioContext = class { async decodeAudioData() { return { duration: 90 }; } async close() { closed = true; } };
  (globalThis as any).OfflineAudioContext = class {
    destination = {};
    constructor(_channels: number, count: number) { frames = count; }
    createBufferSource() { return { connect() {}, start() {} }; }
    async startRendering() { return { numberOfChannels: 1, sampleRate: 24000, length: frames, getChannelData: () => new Float32Array(frames) }; }
  };
  (globalThis as any).File = class { constructor(..._args: unknown[]) {} };
  (globalThis as any).FileReader = class { result = 'data:audio/wav;base64,test'; onload: () => void = () => {}; readAsDataURL() { this.onload(); } };
  try {
    const result = await cropVoiceReference({ name: 'long.mp3', base64: 'sample' }, 15);
    assert.equal(frames, 15 * 24000);
    assert.equal(result.cropped, true);
    assert.equal(result.duration, 15);
    assert.equal(closed, true);
  } finally { Object.assign(globalThis, originals); }
});
