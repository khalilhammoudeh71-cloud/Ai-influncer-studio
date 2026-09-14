import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveVideoAspectRatio } from './videoAspectRatio';

test('Wan can animate a 4:5 campaign photo by adapting to its source image', () => {
  for (const model of ['wavespeed-i2v:alibaba/wan-3.0/image-to-video', 'wavespeed-i2v:alibaba/wan-3.0-prime/image-to-video']) {
    const payload = JSON.parse(JSON.stringify({ image: 'data:image/jpeg;base64,test', aspect_ratio: resolveVideoAspectRatio(model, '4:5', true), duration: 5, resolution: '720p' }));
    assert.equal('aspect_ratio' in payload, false);
    assert.equal(payload.duration, 5);
    assert.equal(payload.resolution, '720p');
    assert.ok(payload.image);
  }
});

test('supported Wan output framing and unrelated providers remain unchanged', () => {
  for (const ratio of ['16:9', '9:16', '1:1', '4:3', '3:4']) assert.equal(resolveVideoAspectRatio('wavespeed-i2v:alibaba/wan-3.0/image-to-video', ratio, true), ratio);
  assert.equal(resolveVideoAspectRatio('wavespeed-i2v:other/model', '4:5', true), '4:5');
  assert.equal(resolveVideoAspectRatio('wavespeed-t2v:alibaba/wan-3.0/text-to-video', '4:5', false), '4:5');
  assert.equal(resolveVideoAspectRatio('wavespeed-i2v:alibaba/wan-3.0/image-to-video', undefined, true), undefined);
});
