import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PERSONA_LLM_ID,
  PERSONA_LLM_OPTIONS,
  getAtlasPersonaModelId,
  normalizePersonaLlmId,
} from '../shared/personaLlm';

test('keeps Grok as the Persona Chat default', () => {
  assert.equal(DEFAULT_PERSONA_LLM_ID, 'grok');
  assert.equal(normalizePersonaLlmId(undefined), 'grok');
  assert.equal(normalizePersonaLlmId('default'), 'grok');
  assert.equal(normalizePersonaLlmId('unknown-provider'), 'grok');
});

test('normalizes saved aliases without changing explicit supported choices', () => {
  assert.equal(normalizePersonaLlmId('qwen'), 'atlas-qwen');
  assert.equal(normalizePersonaLlmId('atlas'), 'atlas-deepseek');
  assert.equal(normalizePersonaLlmId('runware'), 'runware');
  assert.equal(normalizePersonaLlmId('deepseek'), 'deepseek');
  assert.equal(normalizePersonaLlmId('venice'), 'venice');
});

test('maps every Atlas selector to the exact backend model', () => {
  assert.equal(getAtlasPersonaModelId('atlas-qwen'), 'qwen/qwen3.6-plus');
  assert.equal(getAtlasPersonaModelId('atlas-deepseek'), 'deepseek-ai/deepseek-v3.2');
  assert.equal(getAtlasPersonaModelId('atlas-glm'), 'zai-org/GLM-4.6');
  assert.equal(getAtlasPersonaModelId('grok'), undefined);
});

test('exposes unique selectable model ids', () => {
  const ids = PERSONA_LLM_OPTIONS.map(option => option.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes(DEFAULT_PERSONA_LLM_ID));
});

test('gives every Simple-mode choice a unique outcome label without provider names', () => {
  const labels = PERSONA_LLM_OPTIONS.map(option => option.simpleLabel);
  const providerNames = /grok|xai|wiro|runware|wavespeed|deepseek|venice|atlas|qwen|glm|gemini|google/i;

  assert.equal(new Set(labels).size, labels.length);
  labels.forEach(label => {
    assert.ok(label.trim().length > 0);
    assert.equal(providerNames.test(label), false);
  });
});
