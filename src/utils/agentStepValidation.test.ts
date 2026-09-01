import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAgentSteps } from './agentStepValidation';

test('keeps supported Super Agent steps with safe defaults', () => {
  assert.deepEqual(normalizeAgentSteps([
    { type: 'generate_image', params: { prompt: 'portrait' }, status: 'executing' },
  ]), [
    { type: 'generate_image', params: { prompt: 'portrait' }, status: 'pending' },
  ]);
});

test('drops malformed and unsupported model-authored steps', () => {
  assert.deepEqual(normalizeAgentSteps([
    {},
    { type: undefined },
    { type: 'run_shell', params: { command: 'anything' } },
    null,
  ]), []);
});

