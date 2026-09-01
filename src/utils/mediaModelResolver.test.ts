import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveMediaModelFromPrompt } from './mediaModelResolver';

const imageModels = [
  { id: 'wavespeed:bytedance/seedream-v5.0-pro', name: 'Seedream 5.0 Pro', provider: 'Wavespeed' },
  { id: 'openai:gpt-image-2', name: 'GPT Image 2 (OpenAI)', provider: 'OpenAI' },
  { id: 'wavespeed:qwen/qwen-image-3.0-pro', name: 'Qwen 3.0 Pro', provider: 'Wavespeed' },
];

const videoModels = [
  { id: 'wavespeed-i2v:alibaba/wan-3.0/image-to-video', name: 'Wan 3.0 Image to Video', provider: 'Wavespeed' },
  { id: 'wavespeed-i2v:bytedance/seedance-2-mini', name: 'Seedance 2.0 Mini', provider: 'Wavespeed' },
  { id: 'wavespeed-i2v:bytedance/seedance-2.5', name: 'Seedance 2.5', provider: 'Wavespeed' },
];

test('resolves GPT 2.0 and removes the directive from the image prompt', () => {
  const result = resolveMediaModelFromPrompt(
    'generate an image of yourself in a fancy dress, use GPT 2.0',
    imageModels,
    'image',
  );
  assert.equal(result.explicit, true);
  assert.equal(result.matched, true);
  if (!result.matched) return;
  assert.equal(result.modelId, 'openai:gpt-image-2');
  assert.equal(result.prompt, 'generate an image of yourself in a fancy dress');
});

test('keeps Seedream as the unchanged settings default when no directive is present', () => {
  const prompt = 'generate an image of yourself in a fancy dress';
  assert.deepEqual(resolveMediaModelFromPrompt(prompt, imageModels, 'image'), {
    explicit: false,
    prompt,
  });
});

test('resolves an explicit video model', () => {
  const result = resolveMediaModelFromPrompt('make a cinematic clip using Seedance 2.5', videoModels, 'video');
  assert.equal(result.explicit, true);
  assert.equal(result.matched, true);
  if (!result.matched) return;
  assert.equal(result.modelId, 'wavespeed-i2v:bytedance/seedance-2.5');
  assert.equal(result.prompt, 'make a cinematic clip');
});

test('resolves WAN 3.0 by its short model name', () => {
  const result = resolveMediaModelFromPrompt('make a cinematic clip using WAN 3.0', videoModels, 'video');
  assert.equal(result.explicit, true);
  assert.equal(result.matched, true);
  if (!result.matched) return;
  assert.equal(result.modelId, 'wavespeed-i2v:alibaba/wan-3.0/image-to-video');
  assert.equal(result.prompt, 'make a cinematic clip');
});

test('reports an unavailable explicitly requested model', () => {
  const result = resolveMediaModelFromPrompt('make a portrait, use Imaginary Model 9', imageModels, 'image');
  assert.equal(result.explicit, true);
  assert.equal(result.matched, false);
  if (result.matched) return;
  assert.equal(result.requestedText, 'Imaginary Model 9');
});

test('does not treat ordinary descriptive wording as a model directive', () => {
  const prompt = 'generate a photo with a fashion model';
  assert.deepEqual(resolveMediaModelFromPrompt(prompt, imageModels, 'image'), {
    explicit: false,
    prompt,
  });
});
