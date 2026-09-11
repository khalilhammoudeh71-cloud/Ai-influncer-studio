import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWiroPersonaPrompt, DEFAULT_RUNWARE_PERSONA_MODEL, DEFAULT_WIRO_PERSONA_MODEL } from './wiroPersona';

test('uses the refusal-reduced Wiro model with a stronger Runware fallback', () => {
  assert.equal(DEFAULT_WIRO_PERSONA_MODEL, 'seed-v2.1-turbo-uncensored');
  assert.equal(DEFAULT_RUNWARE_PERSONA_MODEL, 'deepseek:v4@pro');
});

test('renders one bounded live-call transcript without inventing provider history', () => {
  const prompt = buildWiroPersonaPrompt('You are Leen. Reply naturally.', [
    { role: 'user', content: 'I had a dream about you.' },
    { role: 'assistant', content: 'Tell me.' },
    { role: 'user', content: 'It was intense.' },
  ]);
  assert.match(prompt, /^You are Leen/);
  assert.match(prompt, /CALLER: I had a dream about you\./);
  assert.match(prompt, /PERSONA: Tell me\./);
  assert.match(prompt, /CALLER: It was intense\.\nPERSONA:$/);
});

test('waits past Wiro pending structured output instead of speaking object coercion', async () => {
  const { requestWiroPersonaDialogue } = await import('./wiroPersona');
  const responses = [
    { taskid: 'test-task' },
    { tasklist: [{ status: 'task_assign', outputs: [{ contenttype: 'raw', content: { prompt: 'private prompt', raw: '', thinking: [], answer: [], segments: [], finishreason: null } }] }] },
    { tasklist: [{ status: 'task_end', outputs: [{ contenttype: 'raw', content: { raw: 'Hello there.', answer: [], finishreason: 'stop' } }] }] },
  ];
  const result = await requestWiroPersonaDialogue({
    apiKey: 'test', apiSecret: 'test', systemPrompt: 'Reply naturally.', messages: [], userId: 'test', sessionId: 'test',
    fetchImpl: async () => new Response(JSON.stringify(responses.shift()), { status: 200 }),
  });
  assert.equal(result, 'Hello there.');
});

test('does not turn structured metadata into speech when a Wiro task fails', async () => {
  const { requestWiroPersonaDialogue } = await import('./wiroPersona');
  const responses = [{ taskid: 'test-task' }, { tasklist: [{ status: 'task_error', debugoutput: 'provider unavailable', outputs: [{ content: { prompt: 'private prompt', thinking: ['private reasoning'], finishreason: null } }] }] }];
  await assert.rejects(requestWiroPersonaDialogue({
    apiKey: 'test', apiSecret: 'test', systemPrompt: 'Reply naturally.', messages: [], userId: 'test', sessionId: 'test',
    fetchImpl: async () => new Response(JSON.stringify(responses.shift()), { status: 200 }),
  }), /provider unavailable/);
});
