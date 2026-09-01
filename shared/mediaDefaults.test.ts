import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_IMAGE_MODEL_ID,
  DEFAULT_VIDEO_MODEL_ID,
  pickDefaultImageModel,
  pickDefaultVideoModel,
  pickDefaultVideoModelForType,
} from './mediaDefaults';

test('uses WaveSpeed Seedream 5.0 Pro as the image default', () => {
  const models = [
    { id: 'openai:gpt-image-2', name: 'GPT Image 2', provider: 'OpenAI' },
    { id: DEFAULT_IMAGE_MODEL_ID, name: 'Seedream 5.0 Pro', provider: 'WaveSpeed AI' },
  ];
  assert.equal(pickDefaultImageModel(models)?.id, DEFAULT_IMAGE_MODEL_ID);
});

test('uses the matching WaveSpeed Wan 3.0 mode in the standalone video studio', () => {
  const models = [
    { id: 'wavespeed-t2v:vidu/text-to-video', name: 'Vidu', provider: 'WaveSpeed AI', type: 'text-to-video' },
    { id: 'wavespeed-t2v:alibaba/wan-3.0-t2v-1080p', name: 'Wan 3.0 T2V', provider: 'Alibaba / WaveSpeed', type: 'text-to-video' },
    { id: DEFAULT_VIDEO_MODEL_ID, name: 'Wan 3.0 I2V', provider: 'Alibaba / WaveSpeed', type: 'image-to-video' },
  ];
  assert.equal(
    pickDefaultVideoModelForType(models, 'text-to-video')?.id,
    'wavespeed-t2v:alibaba/wan-3.0-t2v-1080p',
  );
  assert.equal(pickDefaultVideoModelForType(models, 'image-to-video')?.id, DEFAULT_VIDEO_MODEL_ID);
});

test('uses WaveSpeed Wan 3.0 image-to-video as the video default', () => {
  const models = [
    { id: 'wavespeed-i2v:bytedance/seedance-2-mini', name: 'Seedance 2.0 Mini', provider: 'WaveSpeed AI', type: 'image-to-video' },
    { id: DEFAULT_VIDEO_MODEL_ID, name: 'Wan 3.0 Image to Video', provider: 'WaveSpeed AI', type: 'image-to-video' },
  ];
  assert.equal(pickDefaultVideoModel(models)?.id, DEFAULT_VIDEO_MODEL_ID);
});

test('prefers a live WaveSpeed Wan 3.0 I2V catalog variant when the canonical id changes', () => {
  const models = [
    { id: 'wavespeed-t2v:alibaba/wan-3.0/text-to-video', name: 'Wan 3.0 Text to Video', provider: 'Alibaba / WaveSpeed', type: 'text-to-video' },
    { id: 'wavespeed-i2v:alibaba/wan-3.0/image-to-video-fast', name: 'Wan 3.0 Image to Video Fast', provider: 'Alibaba / WaveSpeed', type: 'image-to-video' },
  ];
  assert.equal(pickDefaultVideoModel(models)?.id, 'wavespeed-i2v:alibaba/wan-3.0/image-to-video-fast');
});
