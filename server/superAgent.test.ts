import assert from 'node:assert/strict';
import test from 'node:test';
import {
  estimateSuperAgentCost,
  modelSupportsNativeTools,
  normalizeSuperAgentMediaRouting,
  normalizeSuperAgentPlanSteps,
  normalizeSuperAgentModelCatalog,
  normalizeVeniceModelCatalog,
  parseAgentToolArguments,
  selectSuperAgentRoute,
} from './superAgent';

test('uses the fast route for trivial conversation without research', () => {
  const route = selectSuperAgentRoute({ prompt: 'Hello!' });
  assert.equal(route.effort, 'fast');
  assert.equal(route.reasoningEffort, 'low');
  assert.equal(route.enableWebSearch, 'off');
});

test('uses deep reasoning, search, scraping, and citations for webpage research', () => {
  const route = selectSuperAgentRoute({
    prompt: 'Investigate this competitor and build a launch strategy',
    research: { deepResearch: true, webpageResearch: true, webpageUrl: 'https://example.com' },
  });
  assert.equal(route.effort, 'deep');
  assert.equal(route.reasoningEffort, 'high');
  assert.equal(route.enableWebSearch, 'on');
  assert.equal(route.enableWebScraping, true);
  assert.equal(route.includeCitations, true);
});

test('keeps adult creative work on an available refusal-reduced route', () => {
  const route = selectSuperAgentRoute({
    prompt: 'Create an explicit adult photoshoot',
    allowNsfw: true,
    configuredProviders: ['wiro', 'venice'],
  });
  assert.deepEqual(route.modelCandidates[0], {
    provider: 'wiro',
    model: process.env.WIRO_SUPER_AGENT_UNCENSORED_MODEL || 'bytedance/seed-v2-pro-uncensored',
  });
});

test('Adult mode stays on refusal-reduced routes even for prompts without explicit keywords', () => {
  const route = selectSuperAgentRoute({
    prompt: 'Continue our conversation naturally',
    allowNsfw: true,
    configuredProviders: ['runware', 'wiro', 'venice'],
  });
  assert.deepEqual(route.modelCandidates[0], {
    provider: 'wiro',
    model: process.env.WIRO_SUPER_AGENT_UNCENSORED_MODEL || 'bytedance/seed-v2-pro-uncensored',
  });
});

test('prefers models that are currently present in each provider catalog', () => {
  const catalog = normalizeVeniceModelCatalog({ data: [
    { id: 'deepseek-v4-pro', model_spec: { capabilities: { supportsReasoning: true } } },
    { id: 'zai-org-glm-5-1', model_spec: { capabilities: { supportsFunctionCalling: true, supportsReasoning: true } } },
  ] });
  const route = selectSuperAgentRoute({
    prompt: 'Analyze and plan a campaign',
    catalog,
    configuredProviders: ['venice'],
  });
  assert.deepEqual(route.modelCandidates[0], { provider: 'venice', model: 'zai-org-glm-5-1' });
  assert.equal(modelSupportsNativeTools(route.modelCandidates[0], catalog), true);
});

test('never promotes an unknown expensive catalog model ahead of the bounded candidate list', () => {
  const catalog = normalizeVeniceModelCatalog({ data: [
    { id: 'unexpected-premium-model', model_spec: { capabilities: { supportsReasoning: true } } },
  ] });
  const route = selectSuperAgentRoute({
    prompt: 'Analyze and plan a campaign',
    catalog,
    configuredProviders: ['venice'],
  });
  assert.equal(route.modelCandidates.some(candidate => candidate.model === 'unexpected-premium-model'), false);
});

test('uses Runware DeepSeek Flash first for the low-latency route', () => {
  const route = selectSuperAgentRoute({
    prompt: 'Hello!',
    configuredProviders: ['runware', 'wavespeed', 'venice'],
  });
  assert.deepEqual(route.modelCandidates[0], { provider: 'runware', model: 'deepseek:v4@flash' });
  assert.equal(modelSupportsNativeTools(route.modelCandidates[0], []), true);
});

test('normalizes Wiro tool capabilities and token pricing from its live catalog shape', () => {
  const [model] = normalizeSuperAgentModelCatalog('wiro', { data: [{
    id: '(Wiro) openai/gpt-5-6-sol',
    pricing: { prompt: '0.000005', completion: '0.00003' },
    supported_parameters: ['tools', 'reasoning_effort'],
    capabilities: { input_modalities: ['text', 'image'], output: ['text', 'function_calls'] },
  }] });
  assert.equal(model.id, 'openai/gpt-5-6-sol');
  assert.equal(model.supportsFunctionCalling, true);
  assert.equal(model.supportsReasoningEffort, true);
  assert.equal(model.supportsVision, true);
  assert.equal(estimateSuperAgentCost(
    { prompt_tokens: 1_000, completion_tokens: 100 },
    model,
  ), 0.008);
});

test('filters a configured Wiro route against the account catalog', () => {
  const catalog = normalizeSuperAgentModelCatalog('wiro', { data: [
    { id: 'bytedance/seed-v2-pro', capabilities: { function_tools: true } },
  ] });
  const route = selectSuperAgentRoute({
    prompt: 'Draft a thoughtful creator strategy',
    requestedModel: 'wiro-smart',
    configuredProviders: ['wiro'],
    catalog,
  });
  assert.deepEqual(route.modelCandidates, [{ provider: 'wiro', model: 'bytedance/seed-v2-pro' }]);
});

test('parses tool arguments defensively', () => {
  assert.deepEqual(parseAgentToolArguments('{"summary":"Ready","steps":[]}'), { summary: 'Ready', steps: [] });
  assert.equal(parseAgentToolArguments('{broken'), null);
  assert.equal(parseAgentToolArguments([]), null);
});

test('normalizes native plans before the client can execute them', () => {
  assert.deepEqual(normalizeSuperAgentPlanSteps([
    { type: 'generate_image', params: { prompt: 'portrait' } },
    { type: 'delete_everything', params: {} },
  ]), [
    { type: 'generate_image', params: { prompt: 'portrait' }, status: 'pending' },
  ]);
});

test('forces Seedream and Seedance through WaveSpeed while leaving WAN 3.0 as the default', () => {
  assert.equal(
    normalizeSuperAgentMediaRouting('generate_image', { modelId: 'runware:bytedance/seedream-v5-pro' }).modelId,
    'wavespeed:bytedance/seedream-v5.0-pro',
  );
  assert.equal(
    normalizeSuperAgentMediaRouting('edit_image', { modelId: 'wiro:bytedance/seedream-v5-pro' }).modelId,
    'wavespeed-edit:bytedance/seedream-v5.0-pro/edit',
  );
  assert.equal(
    normalizeSuperAgentMediaRouting('generate_video', { modelId: 'wiro-video:bytedance/seedance-2.5' }).modelId,
    'wavespeed-i2v:bytedance/seedance-2.5',
  );
  assert.equal(
    normalizeSuperAgentMediaRouting('generate_video', { modelId: 'wavespeed-i2v:alibaba/wan-3.0/image-to-video' }).modelId,
    'wavespeed-i2v:alibaba/wan-3.0/image-to-video',
  );
});
