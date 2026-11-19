import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTextPlanningModel, listPlanningModels, planningModelId } from './planningModels';

test('groups equivalent provider routes and retains distinct model variants', () => {
  const models = listPlanningModels([
    { provider: 'runware', model: 'deepseek:v4@flash' },
    { provider: 'wavespeed', model: 'deepseek/deepseek-v4-flash' },
    { provider: 'runware', model: 'deepseek:v4@pro' },
    { provider: 'atlas', model: 'meta-llama/Llama-3.3-70B-Instruct' },
    { provider: 'wiro', model: 'meta/Llama-3.3-70B-Instruct' },
  ]);
  assert.deepEqual(models.map(({ id, providers }) => [id, providers]), [
    ['catalog:deepseek-v4-flash', ['runware', 'wavespeed']],
    ['catalog:deepseek-v4-pro', ['runware']],
    ['catalog:llama-3.3-70b-instruct', ['atlas', 'wiro']],
  ]);
  assert.notEqual(planningModelId('grok-4.6'), planningModelId('grok-4.6-preview'));
});

test('excludes known non-planning model types', () => {
  for (const model of ['text-embedding-3-small', 'gpt-4o-realtime-preview', 'gpt-image-1', 'gemini-2.5-flash-tts']) {
    assert.equal(isTextPlanningModel(model), false, model);
  }
  assert.equal(isTextPlanningModel('gemini-3.1-pro-preview'), true);
});
