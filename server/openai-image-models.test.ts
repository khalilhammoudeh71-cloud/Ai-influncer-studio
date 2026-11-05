import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directImageModels, getDirectImageModel, directImageOptions } from './openai-image-models';

test('Sunburst uses the tested high-quality portrait settings without legacy aspect stretching', () => {
  assert.deepEqual(directImageOptions('openai:gpt-image-2.5-sunburst', '2:3'), {quality:'high',size:'1024x1536'});
  assert.deepEqual(directImageOptions('openai:gpt-image-2.5-sunburst', '16:9'), {quality:'high',size:'1536x1024'});
  assert.deepEqual(directImageOptions('openai:gpt-image-2.5-sunburst', '1:1'), {quality:'high',size:'1024x1024'});
});

test('both 2.5 choices resolve to their exact provider ID and support references', () => {
  for (const suffix of ['flare', 'sunburst']) {
    const id = `openai:gpt-image-2.5-${suffix}`;
    const model = directImageModels().find(m => m.id === id);
    assert.ok(model?.hasReferenceImage && model.hasEditVariant);
    assert.equal(getDirectImageModel(id)?.apiModel, `gpt-image-2.5-${suffix}`);
  }
});
test('unknown models cannot silently resolve to GPT Image 2', () => {
  assert.equal(getDirectImageModel('openai:gpt-image-2.5'), undefined);
  assert.equal(getDirectImageModel('wavespeed:gpt-image-2'), undefined);
  assert.equal(getDirectImageModel('openai:gpt-image-2')?.apiModel, 'gpt-image-2');
});
