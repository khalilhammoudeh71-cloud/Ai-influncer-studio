import assert from 'node:assert/strict';
import test from 'node:test';
import {
  annotateLatestUpgrades,
  buildCatalogInputMetadata,
  buildUniversalModelInput,
  catalogCompatibility,
  modelReleaseScore,
  type DiscoveredModelInfo,
} from './providerModelCatalog';

test('accepts a newly discovered standard image-to-video schema', () => {
  const schema = {
    required: ['prompt', 'image'],
    properties: {
      prompt: { type: 'string' },
      image: { type: 'string' },
      resolution: { type: 'string', default: '1080p' },
      duration: { type: 'number', default: 5 },
    },
  };
  assert.deepEqual(catalogCompatibility('image-to-video', schema), { compatible: true });
  const metadata = buildCatalogInputMetadata(schema);
  assert.equal(metadata.inputMap.image, 'image');
  assert.equal(metadata.inputDefaults.resolution, '1080p');
});

test('quarantines a model with an unknown required input', () => {
  const result = catalogCompatibility('text-to-video', {
    required: ['prompt', 'proprietary_camera_rig'],
    properties: {
      prompt: { type: 'string' },
      proprietary_camera_rig: { type: 'object' },
    },
  });
  assert.equal(result.compatible, false);
  assert.match(result.reason || '', /proprietary_camera_rig/);
});

test('maps canonical inputs to provider field names and preserves defaults', () => {
  const payload = buildUniversalModelInput({
    inputMap: { prompt: 'positive_prompt', image: 'image_urls', aspectRatio: 'aspect_ratio' },
    inputDefaults: { output_format: 'jpeg' },
    inputOptions: {},
    arrayInputFields: ['image_urls'],
  }, {
    prompt: 'portrait at sunset',
    image: 'https://example.com/ref.jpg',
    aspectRatio: '9:16',
  });
  assert.deepEqual(payload, {
    output_format: 'jpeg',
    positive_prompt: 'portrait at sunset',
    image_urls: ['https://example.com/ref.jpg'],
    aspect_ratio: '9:16',
  });
});

test('keeps a provider default when a generic UI option is not valid for its schema', () => {
  const payload = buildUniversalModelInput({
    inputMap: { prompt: 'prompt', resolution: 'image_size' },
    inputDefaults: { image_size: 'square_hd' },
    inputOptions: { image_size: ['square_hd', 'landscape_16_9'] },
    arrayInputFields: [],
  }, { prompt: 'portrait', resolution: '1k' });
  assert.equal(payload.image_size, 'square_hd');
});

test('recognizes Wan Prime as the latest upgrade without changing the default', () => {
  const base: DiscoveredModelInfo = {
    id: 'wavespeed-i2v:alibaba/wan-3.0/image-to-video',
    name: 'Wan 3.0 Image to Video', provider: 'Alibaba / WaveSpeed', type: 'image-to-video',
    price: 0.5, description: '', apiPath: '', hasEditVariant: false,
  };
  const prime: DiscoveredModelInfo = {
    ...base,
    id: 'wavespeed-i2v:alibaba/wan-3.0-prime/image-to-video',
    name: 'Wan 3.0 Prime Image to Video',
    price: 0.75,
  };
  assert.ok(modelReleaseScore(prime) > modelReleaseScore(base));
  const annotated = annotateLatestUpgrades([base, prime]);
  assert.equal(annotated.find(model => model.id === prime.id)?.isUpgrade, true);
  assert.equal(annotated.find(model => model.id === base.id)?.isUpgrade, false);
});
