import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directImageModels, getDirectImageModel } from './openai-image-models';

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
