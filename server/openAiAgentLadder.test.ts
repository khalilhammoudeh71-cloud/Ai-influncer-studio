import assert from 'node:assert/strict';
import test from 'node:test';
import { runOpenAICostLadder } from './openAiAgentLadder';

const envelope = (quality: Record<string, unknown>, text = 'Ready.') => JSON.stringify({
  text,
  suggestedSteps: [],
  campaign: null,
  quality,
});

const response = (text: string, inputTokens = 1_000, outputTokens = 100) => new Response(JSON.stringify({
  id: 'resp_test',
  status: 'completed',
  output: [{
    type: 'message',
    role: 'assistant',
    content: [{ type: 'output_text', text, annotations: [] }],
  }],
  usage: { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: inputTokens + outputTokens },
}), { status: 200, headers: { 'content-type': 'application/json' } });

test('cost ladder starts with Luna, escalates failed quality, and stops on Terra success', async () => {
  const seen: Array<{ model: string; reasoning: string; schemaRequired: string[] }> = [];
  const result = await runOpenAICostLadder({
    apiKey: 'test-key',
    instructions: 'Follow the request.',
    messages: [{ role: 'user', content: 'Give me three campaign ideas.' }],
    request: 'Give me three campaign ideas.',
    fetcher: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      seen.push({
        model: body.model,
        reasoning: body.reasoning.effort,
        schemaRequired: body.text.format.schema.required,
      });
      return body.model === 'gpt-5.6-luna'
        ? response(envelope({
            shouldEscalate: true,
            confidence: 0.64,
            accuracy: 'uncertain',
            completeness: 'pass',
            instructionFollowing: 'pass',
            reason: 'The first draft may contain an unsupported claim.',
          }))
        : response(envelope({
            shouldEscalate: false,
            confidence: 0.94,
            accuracy: 'pass',
            completeness: 'pass',
            instructionFollowing: 'pass',
            reason: 'The requested ideas are complete and grounded.',
          }, 'Three campaign ideas are ready.'));
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.model, 'gpt-5.6-terra');
  assert.equal(result.decoded.text, 'Three campaign ideas are ready.');
  assert.deepEqual(result.attempts.map(attempt => [attempt.model, attempt.outcome]), [
    ['gpt-5.6-luna', 'escalated'],
    ['gpt-5.6-terra', 'accepted'],
  ]);
  assert.deepEqual(seen.map(item => [item.model, item.reasoning]), [
    ['gpt-5.6-luna', 'low'],
    ['gpt-5.6-terra', 'medium'],
  ]);
  assert.ok(seen.every(item => item.schemaRequired.includes('quality')));
  assert.equal(result.inputTokens, 2_000);
  assert.equal(result.outputTokens, 200);
  assert.equal(result.costUsd, 0.00352);
});

test('cost ladder advances after incomplete and HTTP-failed attempts', async () => {
  const seen: string[] = [];
  const result = await runOpenAICostLadder({
    apiKey: 'test-key',
    instructions: 'Follow the request.',
    messages: [{ role: 'user', content: 'Explain the campaign.' }],
    request: 'Explain the campaign.',
    candidates: [
      { provider: 'openai', model: 'gpt-5.6-luna' },
      { provider: 'openai', model: 'gpt-5.6-terra' },
      { provider: 'openai', model: 'gpt-5.6-sol' },
    ],
    fetcher: async (_url, init) => {
      const model = JSON.parse(String(init?.body)).model;
      seen.push(model);
      if (model === 'gpt-5.6-luna') return new Response('{}', { status: 429 });
      if (model === 'gpt-5.6-terra') return new Response(JSON.stringify({
        status: 'incomplete',
        incomplete_details: { reason: 'max_output_tokens' },
        output: [],
        usage: { input_tokens: 50, output_tokens: 50, total_tokens: 100 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
      return response(envelope({
        shouldEscalate: false,
        confidence: 0.9,
        accuracy: 'pass',
        completeness: 'pass',
        instructionFollowing: 'pass',
        reason: 'Complete.',
      }));
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(seen, ['gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.6-sol']);
  assert.deepEqual(result.attempts.map(attempt => attempt.outcome), ['error', 'incomplete', 'accepted']);
});

test('cost ladder does not report an unknown override model as free', async () => {
  const result = await runOpenAICostLadder({
    apiKey: 'test-key',
    instructions: 'Follow the request.',
    messages: [{ role: 'user', content: 'Answer carefully.' }],
    request: 'Answer carefully.',
    candidates: [{ provider: 'openai', model: 'gpt-custom-unknown-price' }],
    fetcher: async () => response(envelope({
      shouldEscalate: false,
      confidence: 0.9,
      accuracy: 'pass',
      completeness: 'pass',
      instructionFollowing: 'pass',
      reason: 'Complete.',
    })),
  });

  assert.equal(result.ok, true);
  assert.equal(result.costUsd, undefined);
});

test('cost ladder stops before making a request when the caller is already aborted', async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  const result = await runOpenAICostLadder({
    apiKey: 'test-key',
    instructions: 'Follow the request.',
    messages: [{ role: 'user', content: 'Answer carefully.' }],
    request: 'Answer carefully.',
    signal: controller.signal,
    fetcher: async () => {
      calls += 1;
      return response('{}');
    },
  });

  assert.equal(result.ok, false);
  assert.equal(calls, 0);
});
