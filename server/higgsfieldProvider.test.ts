import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HIGGSFIELD_IMAGE_MODELS,
  HIGGSFIELD_VIDEO_MODELS,
  buildHiggsfieldImageInput,
  buildHiggsfieldVideoInput,
  ensureHiggsfieldMediaUrl,
  extractHiggsfieldOutputUrls,
  runHiggsfieldGeneration,
} from './higgsfieldProvider';

test('keeps public media URLs unchanged without uploading them', async () => {
  let called = false;
  const url = await ensureHiggsfieldMediaUrl('https://example.com/source.png', 'key-id:key-secret', async () => {
    called = true;
    throw new Error('fetch should not be called');
  });

  assert.equal(url, 'https://example.com/source.png');
  assert.equal(called, false);
});

test('uploads inline media through a Higgsfield presigned URL without leaking credentials', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fakeFetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (calls.length === 1) {
      return new Response(JSON.stringify({
        upload_url: 'https://storage.example.com/upload',
        public_url: 'https://cdn.example.com/source.png',
        upload_headers: { 'x-upload-token': 'temporary' },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(null, { status: 200 });
  };

  const url = await ensureHiggsfieldMediaUrl('data:image/png;base64,aGk=', 'key-id:key-secret', fakeFetch);

  assert.equal(url, 'https://cdn.example.com/source.png');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://api.higgsfield.ai/files/generate-upload-url');
  assert.equal(new Headers(calls[0].init?.headers).get('authorization'), 'Key key-id:key-secret');
  assert.equal(new Headers(calls[0].init?.headers).get('content-type'), 'application/json');
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { content_type: 'image/png' });
  assert.equal(calls[1].url, 'https://storage.example.com/upload');
  assert.equal(new Headers(calls[1].init?.headers).get('authorization'), null);
  assert.equal(new Headers(calls[1].init?.headers).get('x-upload-token'), 'temporary');
  assert.deepEqual(Buffer.from(await new Response(calls[1].init?.body).arrayBuffer()), Buffer.from('hi'));
});

test('publishes documented image and video models with stable app IDs', () => {
  assert.deepEqual(HIGGSFIELD_IMAGE_MODELS.map(model => [model.id, model.type]), [
    ['higgsfield-image:marketing-studio/image', 'text-to-image'],
    ['higgsfield-image:higgsfield-ai/soul/v2/standard', 'text-to-image'],
  ]);
  assert.deepEqual(HIGGSFIELD_VIDEO_MODELS.map(model => [model.id, model.type]), [
    ['higgsfield-video:bytedance/seedance-2.5/text-to-video', 'text-to-video'],
    ['higgsfield-video:bytedance/seedance-2.5/image-to-video', 'image-to-video'],
  ]);
});

test('builds Marketing Studio image input with references and supported UI options', () => {
  assert.deepEqual(buildHiggsfieldImageInput('higgsfield-image:marketing-studio/image', {
    prompt: 'Premium skincare campaign',
    imageUrls: ['https://example.com/product.png', 'https://example.com/model.jpg'],
    resolution: '2k',
    aspectRatio: '3:2',
    count: 4,
  }), {
    prompt: 'Premium skincare campaign',
    image_urls: ['https://example.com/product.png', 'https://example.com/model.jpg'],
    quality: 'high',
    moderation: 'auto',
    resolution: '2k',
    aspect_ratio: '3:2',
    enhance_prompt: false,
  });
});

test('builds Soul 2 input and normalizes unsupported image options', () => {
  assert.deepEqual(buildHiggsfieldImageInput('higgsfield-image:higgsfield-ai/soul/v2/standard', {
    prompt: 'Editorial portrait',
    resolution: '4k',
    aspectRatio: '21:9',
    count: 3,
  }), {
    prompt: 'Editorial portrait',
    batch_size: 1,
    resolution: '1080p',
    aspect_ratio: '4:3',
    enhance_prompt: true,
  });
});

test('builds Seedance text and image video inputs from the shared studio controls', () => {
  assert.deepEqual(buildHiggsfieldVideoInput('higgsfield-video:bytedance/seedance-2.5/text-to-video', {
    prompt: 'Cinematic tracking shot',
    duration: 60,
    resolution: '1080p',
    aspectRatio: '9:16',
    generateAudio: false,
  }), {
    prompt: 'Cinematic tracking shot',
    duration: 30,
    resolution: '720p',
    aspect_ratio: '9:16',
    output_format: 'mp4',
    generate_audio: false,
  });

  assert.deepEqual(buildHiggsfieldVideoInput('higgsfield-video:bytedance/seedance-2.5/image-to-video', {
    prompt: 'Subtle natural motion',
    imageUrl: 'https://example.com/portrait.jpg',
    duration: 2,
  }), {
    prompt: 'Subtle natural motion',
    duration: 4,
    image_url: 'https://example.com/portrait.jpg',
    resolution: '720p',
    output_format: 'mp4',
    generate_audio: true,
  });
});

test('image-to-video refuses to submit without a source image', () => {
  assert.throws(() => buildHiggsfieldVideoInput('higgsfield-video:bytedance/seedance-2.5/image-to-video', {
    prompt: 'Move naturally',
  }), /source image/i);
});

test('extracts completed image and video URLs from documented SDK result shapes', () => {
  assert.deepEqual(extractHiggsfieldOutputUrls({ status: 'completed', images: [{ url: 'https://cdn.example.com/a.jpg' }] }), ['https://cdn.example.com/a.jpg']);
  assert.deepEqual(extractHiggsfieldOutputUrls({ status: 'completed', video: { url: 'https://cdn.example.com/a.mp4' } }), ['https://cdn.example.com/a.mp4']);
  assert.throws(() => extractHiggsfieldOutputUrls({ status: 'failed', error: 'provider rejected request' }), /provider rejected request/i);
});

test('submits the provider model path and returns its completed output', async () => {
  let submitted: unknown;
  const urls = await runHiggsfieldGeneration({
    credentials: 'key-id:key-secret',
    modelId: 'higgsfield-image:higgsfield-ai/soul/v2/standard',
    input: { prompt: 'Editorial portrait' },
    subscribe: async (model, options) => {
      submitted = { model, options };
      return { status: 'completed', images: [{ url: 'https://cdn.example.com/result.jpg' }] };
    },
  });

  assert.deepEqual(submitted, {
    model: 'higgsfield-ai/soul/v2/standard',
    options: { input: { prompt: 'Editorial portrait' }, withPolling: true },
  });
  assert.deepEqual(urls, ['https://cdn.example.com/result.jpg']);
});
