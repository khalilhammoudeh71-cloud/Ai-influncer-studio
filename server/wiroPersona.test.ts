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


test('reads Wiro final answer segments without exposing reasoning or tool metadata', async () => {
  const { requestWiroPersonaDialogue } = await import('./wiroPersona');
  const replies = [{taskid:'test'}, {tasklist:[{status:'task_postprocess_end',pexit:'0',outputs:[{content:{segments:[{type:'thinking',text:'private reasoning'},{type:'answer',text:'Try a quiet walk.'}],finishreason:'stop'}}]}]}];
  const result = await requestWiroPersonaDialogue({apiKey:'test',apiSecret:'test',systemPrompt:'Be brief.',messages:[],userId:'test',sessionId:'test',fetchImpl:async()=>{if(!replies.length)throw new Error('unexpected extra poll');return new Response(JSON.stringify(replies.shift()));}});
  assert.equal(result,'Try a quiet walk.');
});

test('rejects unsuccessful Wiro terminal tasks even when partial text exists', async () => {
  const { requestWiroPersonaDialogue } = await import('./wiroPersona');
  const replies=[{taskid:'test'},{tasklist:[{status:'task_postprocess_end',pexit:'1',outputs:[{content:{raw:'An unfinished answer',finishreason:'error'}}]}]}];
  await assert.rejects(requestWiroPersonaDialogue({apiKey:'test',apiSecret:'test',systemPrompt:'Be brief.',messages:[],userId:'test',sessionId:'test',fetchImpl:async()=>new Response(JSON.stringify(replies.shift()))}),/Wiro persona task failed/);
});


test('accepts completed successful Wiro task with null finishreason', async () => {
  const { requestWiroPersonaDialogue } = await import('./wiroPersona');
  const replies=[{taskid:'test'},{tasklist:[{status:'task_postprocess_end',pexit:'0',outputs:[{content:{segments:[{type:'answer',text:'Hello, hope your day goes well.'}],finishreason:null}}]}]}];
  const result=await requestWiroPersonaDialogue({apiKey:'test',apiSecret:'test',systemPrompt:'Be brief.',messages:[],userId:'test',sessionId:'test',fetchImpl:async()=>{if(!replies.length)throw new Error('discarded completed answer');return new Response(JSON.stringify(replies.shift()));}});
  assert.equal(result,'Hello, hope your day goes well.');
});

test('keeps safety instructions in the system field instead of the caller prompt', async () => {
  const { requestWiroPersonaDialogue } = await import('./wiroPersona');
  const systemPrompt = 'Be helpful. Do not create sexual content involving minors.';
  await requestWiroPersonaDialogue({
    apiKey: 'test', apiSecret: 'test', systemPrompt,
    messages: [{ role: 'user', content: 'Suggest a peaceful activity.' }], userId: 'test', sessionId: 'test',
    fetchImpl: async (url, options) => {
      if (String(url).includes('/Run/')) {
        const body = JSON.parse(String(options?.body));
        assert.equal(body.systemInstructions, systemPrompt);
        assert.match(body.prompt, /CALLER: Suggest a peaceful activity/);
        assert.ok(!body.prompt.includes(systemPrompt));
        return new Response(JSON.stringify({ taskid: 'test' }));
      }
      return new Response(JSON.stringify({ tasklist: [{ status: 'task_postprocess_end', pexit: '0', outputs: [{ content: { raw: 'Take a walk.', finishreason: 'stop' } }] }] }));
    },
  });
});
