import assert from 'node:assert/strict';
import test from 'node:test';

const OPENAI_KEYS = ['OPENAI_API_KEY', 'Openai_api_key', 'openai_api_key', 'AI_INTEGRATIONS_OPENAI_API_KEY'];

// Exercise the deployed route handler, with only external provider HTTP replaced.
// No database credentials or network access are needed by these cases.
test('planner failures do not invent image actions from keywords', async () => {
  const keys=['Gemini_api_key','gemini_api_key','GEMINI_API_KEY','AI_INTEGRATIONS_GEMINI_API_KEY'];
  const saved=keys.map(key=>process.env[key]);
  const {default:router}=await import('./routes');
  keys.forEach(key=>delete process.env[key]);
  const handler=(router as any).stack.find((layer:any)=>layer.route?.path==='/agent/chat').route.stack[0].handle;
  try {
    for(const prompt of ['Create a photo of a blue cup','Text only: calculate the price of three photos. Do not create anything.']) {
      let status=200,data:any;
      await handler({body:{messages:[{role:'user',content:prompt}],voiceLlmModel:'gemini'},user:{id:'test-owner'}},{status(code:number){status=code;return this;},json(value:any){data=value;return this;}});
      assert.ok(status>=400,`An unavailable planner must fail explicitly, got ${status}`);
      assert.deepEqual(data.suggestedSteps,[]);
    }
  } finally {keys.forEach((key,index)=>{if(saved[index]===undefined)delete process.env[key];else process.env[key]=saved[index];});}
});

test('a fenced plan envelope preserves its explanation and yields reviewable steps', async () => {
  const priorKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='test';
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:'```json\n'+JSON.stringify({text:'Review the blue cup and green edit.',status:'executing',suggestedSteps:[{type:'generate_image',params:{prompt:'A blue cup on a wooden table',usePersona:false}},{type:'edit_image',params:{prompt:'Change only the cup to green',sourceImageFromStepIndex:0}}]})+'\n```'}]}}]}));
  try {
    const {default:router}=await import('./routes');
    const handler=(router as any).stack.find((layer:any)=>layer.route?.path==='/agent/chat').route.stack[0].handle;
    let data:any;
    await handler({body:{messages:[{role:'user',content:'Prepare a blue cup and green edit plan for review. Do not execute yet.'}],voiceLlmModel:'frontier-gemini-flash'},user:{id:'test-owner'}},{status(){return this;},json(value:any){data=value;return this;}});
    assert.equal(data.text,'Review the blue cup and green edit.');
    assert.equal(data.status,'clarifying');
    assert.equal(data.suggestedSteps.length,2);
    assert.equal(data.suggestedSteps[1].params.sourceImageFromStepIndex,0);
    assert.deepEqual(data.suggestedSteps.map((step:any) => step.params.modelId), ['openai:gpt-image-2.6-sunburst', 'openai:gpt-image-2.6-sunburst']);
  }finally{globalThis.fetch=originalFetch;if(priorKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=priorKey;}
});

test('accepting a native plan does not require a second model call to summarize it', async () => {
  const names=['GEMINI_API_KEY','RUNWARE_API_KEY','WIRO_API_KEY','ATLASCLOUD_API_KEY','WAVESPEED_API_KEY','VENICE_API_KEY',...OPENAI_KEYS];
  const values=names.map(name=>process.env[name]);names.forEach(name=>delete process.env[name]);
  process.env.GEMINI_API_KEY='test';process.env.RUNWARE_API_KEY='test';
  const originalFetch=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url)=>{
    if(String(url).includes('/models'))return new Response(JSON.stringify({data:[{id:'deepseek:v4@flash',capabilities:{function_tools:true}}]}));
    calls++;
    if(calls>1)throw new Error('A valid plan already exists; no more model calls should be necessary.');
    return new Response(JSON.stringify({choices:[{message:{role:'assistant',tool_calls:[{id:'plan-1',type:'function',function:{name:'create_studio_plan',arguments:JSON.stringify({summary:'Review this blue cup.',steps:[{type:'generate_image',params:{prompt:'A blue ceramic cup',usePersona:false}}]})}}]}}]}));
  };
  try {
    const {default:router}=await import('./routes');
    const handler=(router as any).stack.find((layer:any)=>layer.route?.path==='/agent/chat').route.stack[0].handle;
    let data:any;
    await handler({body:{messages:[{role:'user',content:'Create a blue cup image'}],voiceLlmModel:'adaptive-fast'},user:{id:'test-owner'}},{status(){return this;},json(value:any){data=value;return this;}});
    assert.equal(data.suggestedSteps?.length,1);
    assert.equal(calls,1);
    assert.equal(data.text,'Review this blue cup.');
    assert.equal(data.diagnostics.measurement,'server-wall-clock');
    assert.ok(data.diagnostics.totalMs >= 0);
    assert.ok(data.diagnostics.stagesMs.identity >= 0);
  }finally{globalThis.fetch=originalFetch;names.forEach((name,index)=>{if(values[index]===undefined)delete process.env[name];else process.env[name]=values[index];});}
});

test('plan mode behaves as an LLM and never returns executable studio steps', async () => {
  const names=['GEMINI_API_KEY','RUNWARE_API_KEY','WIRO_API_KEY','ATLASCLOUD_API_KEY','WAVESPEED_API_KEY','VENICE_API_KEY',...OPENAI_KEYS];
  const values=names.map(name=>process.env[name]);names.forEach(name=>delete process.env[name]);
  process.env.GEMINI_API_KEY='test';process.env.RUNWARE_API_KEY='test';
  const originalFetch=globalThis.fetch;let chatCalls=0;
  globalThis.fetch=async(url,init)=>{
    if(String(url).includes('/models'))return new Response(JSON.stringify({data:[{id:'deepseek:v4@flash',capabilities:{function_tools:true}}]}));
    chatCalls++;
    const body=JSON.parse(init!.body as string);
    assert.equal(body.tools,undefined,'Plan mode must not expose execution tools to the model');
    assert.match(body.messages[0].content,/PLAN MODE IS ACTIVE/);
    return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({text:'Three campaign directions: education, transformation, and behind the scenes.',status:'clarifying',suggestedSteps:[{type:'generate_image',params:{prompt:'Should be discarded'}}]})}}]}));
  };
  try {
    const {default:router}=await import('./routes');
    const handler=(router as any).stack.find((layer:any)=>layer.route?.path==='/agent/chat').route.stack[0].handle;
    let data:any;
    await handler({body:{messages:[{role:'user',content:'Give me three campaign ideas and a plan.'}],voiceLlmModel:'adaptive-fast',interactionMode:'plan'},user:{id:'test-owner'}},{status(){return this;},json(value:any){data=value;return this;}});
    assert.equal(chatCalls,1);
    assert.equal(data.interactionMode,'plan');
    assert.equal(data.status,'normal');
    assert.deepEqual(data.suggestedSteps,[]);
    assert.match(data.text,/Three campaign directions/);
  }finally{globalThis.fetch=originalFetch;names.forEach((name,index)=>{if(values[index]===undefined)delete process.env[name];else process.env[name]=values[index];});}
});

test('a partial native plan is rejected and replaced as a whole before review', async () => {
  const names=['RUNWARE_API_KEY',...OPENAI_KEYS];const values=names.map(name=>process.env[name]);names.forEach(name=>delete process.env[name]);process.env.RUNWARE_API_KEY='test';
  const originalFetch=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url,init)=>{
    if(String(url).includes('/models'))return new Response(JSON.stringify({data:[{id:'deepseek:v4@flash',capabilities:{function_tools:true}}]}));
    calls++;
    const params=calls===1?{sourceImageFromStepIndex:0}:{prompt:'Change only the cup to green',sourceImageFromStepIndex:0};
    if(calls===2){const body=JSON.parse(init!.body as string);assert.equal(JSON.parse(body.messages.at(-1).content).ok,false);}
    return new Response(JSON.stringify({choices:[{message:{role:'assistant',tool_calls:[{id:'plan-'+calls,type:'function',function:{name:'create_studio_plan',arguments:JSON.stringify({summary:'Review the blue cup and green edit.',steps:[{type:'generate_image',params:{prompt:'A blue cup'}},{type:'edit_image',params}]})}}]}}]}));
  };
  try {
    const {default:router}=await import('./routes');const handler=(router as any).stack.find((layer:any)=>layer.route?.path==='/agent/chat').route.stack[0].handle;
    let data:any;await handler({body:{messages:[{role:'user',content:'Create a blue cup image then edit it green'}],voiceLlmModel:'adaptive-fast'},user:{id:'test-owner'}},{status(){return this;},json(value:any){data=value;return this;}});
    assert.equal(data.suggestedSteps.length,2);assert.equal(calls,3);assert.equal(data.suggestedSteps[1].params.prompt,'Change only the cup to green');
  }finally{globalThis.fetch=originalFetch;names.forEach((name,index)=>{if(values[index]===undefined)delete process.env[name];else process.env[name]=values[index];});}
});

test('the saved Grok route works without a Gemini credential and preserves provider errors',async()=>{
  const names=['GEMINI_API_KEY','Gemini_api_key','gemini_api_key','AI_INTEGRATIONS_GEMINI_API_KEY','XAI_API_KEY'];
  const values=names.map(name=>process.env[name]);names.forEach(name=>delete process.env[name]);process.env.XAI_API_KEY='test';
  const originalFetch=globalThis.fetch;let fail=false;let calls=0;
  globalThis.fetch=async(url,init)=>{
    assert.equal(url,'https://api.x.ai/v1/chat/completions');calls++;
    const body=JSON.parse(init!.body as string);assert.equal(body.response_format.type,'json_schema');
    return fail?new Response('{}',{status:429}):new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'{"text":"Your budget is $84.","suggestedSteps":[]}'}}]}));
  };
  try {
    const {default:router}=await import('./routes');
    const handler=(router as any).stack.find((layer:any)=>layer.route?.path==='/agent/chat').route.stack[0].handle;
    const call=async()=>{let status=200,data:any;await handler({body:{messages:[{role:'user',content:'Text only: calculate the budget.'}],voiceLlmModel:'grok',allowNsfw:true},user:{id:'test-owner'}},{status(code:number){status=code;return this;},json(value:any){data=value;return this;}});return{status,data};};
    const success=await call();assert.equal(success.status,200);assert.equal(success.data.text,'Your budget is $84.');
    fail=true;const unavailable=await call();assert.equal(unavailable.status,502);assert.match(unavailable.data.text,/429/);assert.deepEqual(unavailable.data.suggestedSteps,[]);assert.equal(calls,2);
  }finally{globalThis.fetch=originalFetch;names.forEach((name,index)=>{if(values[index]===undefined)delete process.env[name];else process.env[name]=values[index];});}
});

test('truncated native and SDK replies never return partial plans',async()=>{
  const names=['GEMINI_API_KEY','RUNWARE_API_KEY',...OPENAI_KEYS];const values=names.map(name=>process.env[name]);
  names.forEach(name=>delete process.env[name]);process.env.GEMINI_API_KEY='test';process.env.RUNWARE_API_KEY='test';
  const originalFetch=globalThis.fetch;
  const steps=[{type:'generate_image',params:{prompt:'A blue cup'}}];
  globalThis.fetch=async(url)=>{
    if(String(url).endsWith('/models'))return new Response(JSON.stringify({data:[{id:'deepseek:v4@flash',capabilities:{function_tools:true}}]}));
    if(String(url).includes('generativelanguage'))return new Response(JSON.stringify({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:JSON.stringify({text:'Review',suggestedSteps:steps})}]}}]}));
    return new Response(JSON.stringify({choices:[{finish_reason:'length',message:{tool_calls:[{id:'partial',type:'function',function:{name:'create_studio_plan',arguments:JSON.stringify({summary:'Partial',steps})}}]}}]}));
  };
  try {
    const {default:router}=await import('./routes');const handler=(router as any).stack.find((layer:any)=>layer.route?.path==='/agent/chat').route.stack[0].handle;
    for(const [voiceLlmModel,prompt] of [['adaptive-fast','Create a blue cup, then edit it green'],['gemini','Create a blue cup, then edit it green'],['gemini','Hello']]) {
      let status=200,data:any;
      await handler({body:{messages:[{role:'user',content:prompt}],voiceLlmModel},user:{id:'test-owner'}},{status(code:number){status=code;return this;},json(value:any){data=value;return this;}});
      assert.ok(status>=400,`${voiceLlmModel}: truncated replies must fail, got ${status}`);assert.deepEqual(data.suggestedSteps,[]);
    }
  }finally{globalThis.fetch=originalFetch;names.forEach((name,index)=>{if(values[index]===undefined)delete process.env[name];else process.env[name]=values[index];});}
});

test('adaptive agent uses the OpenAI cost ladder and reports escalation details', async () => {
  const names = [
    'OPENAI_API_KEY', 'Openai_api_key', 'openai_api_key', 'AI_INTEGRATIONS_OPENAI_API_KEY',
    'GEMINI_API_KEY', 'Gemini_api_key', 'gemini_api_key', 'AI_INTEGRATIONS_GEMINI_API_KEY',
    'RUNWARE_API_KEY', 'WIRO_API_KEY', 'WIRO_API_SECRET', 'ATLASCLOUD_API_KEY',
    'WAVESPEED_API_KEY', 'VENICE_API_KEY', 'VENICEAI_API_KEY', 'Veniceai_api_key',
  ];
  const values = names.map(name => process.env[name]);
  names.forEach(name => delete process.env[name]);
  process.env.OPENAI_API_KEY = 'test';
  const originalFetch = globalThis.fetch;
  const seen: string[] = [];
  globalThis.fetch = async (url, init) => {
    if (String(url) !== 'https://api.openai.com/v1/responses') {
      if (/\/models(?:\?|$)/.test(String(url))) {
        return new Response(JSON.stringify({ data: [] }), { headers: { 'content-type': 'application/json' } });
      }
      return new Response('{}', { status: 503, headers: { 'content-type': 'application/json' } });
    }
    const body = JSON.parse(String(init?.body));
    seen.push(body.model);
    const accepted = body.model === 'gpt-5.6-terra';
    const reply = JSON.stringify({
      text: accepted ? 'Three campaign ideas are ready.' : 'The first draft may be incomplete.',
      suggestedSteps: [],
      campaign: null,
      quality: {
        shouldEscalate: !accepted,
        confidence: accepted ? 0.93 : 0.61,
        accuracy: accepted ? 'pass' : 'uncertain',
        completeness: accepted ? 'pass' : 'uncertain',
        instructionFollowing: 'pass',
        reason: accepted ? 'Complete.' : 'A requested campaign direction may be missing.',
      },
    });
    return new Response(JSON.stringify({
      status: 'completed',
      output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: reply, annotations: [] }] }],
      usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
    }), { headers: { 'content-type': 'application/json' } });
  };

  try {
    const { default: router } = await import('./routes');
    const handler = (router as any).stack.find((layer: any) => layer.route?.path === '/agent/chat').route.stack[0].handle;
    let status = 200;
    let data: any;
    await handler(
      { body: { messages: [{ role: 'user', content: 'Give me three campaign ideas.' }], voiceLlmModel: 'adaptive', interactionMode: 'plan' }, user: { id: 'test-owner' } },
      { status(code: number) { status = code; return this; }, json(value: any) { data = value; return this; } },
    );
    assert.equal(status, 200);
    assert.equal(data.text, 'Three campaign ideas are ready.');
    assert.deepEqual(seen, ['gpt-5.6-luna', 'gpt-5.6-terra']);
    assert.equal(data.agentMode.provider, 'openai');
    assert.equal(data.agentMode.model, 'gpt-5.6-terra');
    assert.equal(data.agentMode.attemptCount, 2);
    assert.deepEqual(data.agentMode.escalatedFrom, ['gpt-5.6-luna']);
    assert.equal(data.agentMode.promptTokens, 200);
    assert.equal(data.agentMode.completionTokens, 100);
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, index) => {
      if (values[index] === undefined) delete process.env[name];
      else process.env[name] = values[index];
    });
  }
});

test('gateway fallback preserves every billed OpenAI attempt in cumulative usage', async () => {
  const names = [
    'OPENAI_API_KEY', 'Openai_api_key', 'openai_api_key', 'AI_INTEGRATIONS_OPENAI_API_KEY',
    'GEMINI_API_KEY', 'Gemini_api_key', 'gemini_api_key', 'AI_INTEGRATIONS_GEMINI_API_KEY',
    'RUNWARE_API_KEY', 'WIRO_API_KEY', 'WIRO_API_SECRET', 'ATLASCLOUD_API_KEY',
    'WAVESPEED_API_KEY', 'VENICE_API_KEY', 'VENICEAI_API_KEY', 'Veniceai_api_key',
  ];
  const values = names.map(name => process.env[name]);
  names.forEach(name => delete process.env[name]);
  process.env.OPENAI_API_KEY = 'test';
  process.env.RUNWARE_API_KEY = 'test';
  const originalFetch = globalThis.fetch;
  const seen: string[] = [];
  globalThis.fetch = async (url, init) => {
    const requestUrl = String(url);
    if (requestUrl === 'https://api.openai.com/v1/responses') {
      const model = JSON.parse(String(init?.body)).model;
      seen.push(model);
      return new Response(JSON.stringify({
        status: 'completed',
        output: [{
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: JSON.stringify({
            text: 'Escalate.',
            suggestedSteps: [],
            campaign: null,
            quality: {
              shouldEscalate: true,
              confidence: 0.5,
              accuracy: 'uncertain',
              completeness: 'uncertain',
              instructionFollowing: 'pass',
              reason: 'Needs a stronger tier.',
            },
          }), annotations: [] }],
        }],
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
      }), { headers: { 'content-type': 'application/json' } });
    }
    if (requestUrl.includes('/models')) {
      return new Response(JSON.stringify({ data: [{ id: 'deepseek:v4@flash', capabilities: {} }] }), {
        headers: { 'content-type': 'application/json' },
      });
    }
    if (requestUrl === 'https://api.runware.ai/v1/chat/completions') {
      seen.push('deepseek:v4@flash');
      return new Response(JSON.stringify({
        choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({
          text: 'Gateway fallback completed the answer.',
          suggestedSteps: [],
          campaign: null,
        }) } }],
        usage: { prompt_tokens: 20, completion_tokens: 10 },
        cost: 0.001,
      }), { headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 503, headers: { 'content-type': 'application/json' } });
  };

  try {
    const { default: router } = await import('./routes');
    const handler = (router as any).stack.find((layer: any) => layer.route?.path === '/agent/chat').route.stack[0].handle;
    let data: any;
    await handler(
      { body: { messages: [{ role: 'user', content: 'Hello!' }], voiceLlmModel: 'adaptive', interactionMode: 'plan' }, user: { id: 'test-owner' }, once() {} },
      { writableFinished: false, once() {}, status() { return this; }, json(value: any) { data = value; this.writableFinished = true; return this; } },
    );
    assert.deepEqual(seen, [
      'gpt-5.6-luna',
      'gpt-5.6-terra',
      'gpt-5.6-sol',
      'gpt-6-astra',
      'deepseek:v4@flash',
    ]);
    assert.equal(data.text, 'Gateway fallback completed the answer.');
    assert.equal(data.agentMode.provider, 'runware');
    assert.equal(data.agentMode.promptTokens, 420);
    assert.equal(data.agentMode.completionTokens, 210);
    assert.equal(data.agentMode.costUsd, 0.00678);
    assert.equal(data.agentMode.attemptCount, 5);
    assert.deepEqual(data.agentMode.escalatedFrom, [
      'gpt-5.6-luna',
      'gpt-5.6-terra',
      'gpt-5.6-sol',
      'gpt-6-astra',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, index) => {
      if (values[index] === undefined) delete process.env[name];
      else process.env[name] = values[index];
    });
  }
});

test('a catalog selection retries only providers serving the selected model', async () => {
  const names = ['WIRO_API_KEY', 'ATLASCLOUD_API_KEY'];
  const previous = names.map(name => process.env[name]);
  for (const name of names) process.env[name] = 'planning-catalog-test';
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (url, init) => {
    const host = new URL(String(url)).hostname;
    const model = host === 'llm.wiro.ai' ? 'meta/Llama-3.3-70B-Instruct' : 'meta-llama/Llama-3.3-70B-Instruct';
    if (String(url).includes('/models')) return Response.json({
      data: ['llm.wiro.ai', 'api.atlascloud.ai'].includes(host) ? [{ id: model }] : [],
    });
    calls.push(`${host}:${JSON.parse(String(init?.body)).model}`);
    if (host === 'llm.wiro.ai') throw new Error('Provider temporarily unreachable');
    return Response.json({
      choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ text: 'Ready.', suggestedSteps: [] }) } }],
    });
  };
  try {
    const { default: router } = await import('./routes');
    const handler = (router as any).stack.find((layer: any) => layer.route?.path === '/agent/chat').route.stack[0].handle;
    let data: any;
    await handler({
      body: { messages: [{ role: 'user', content: 'Hello' }], textPlanningModel: 'catalog:llama-3.3-70b-instruct', voiceLlmModel: 'grok' },
      user: { id: 'test-owner' },
    }, { status() { return this; }, json(value: any) { data = value; return this; } });
    assert.deepEqual(calls, [
      'llm.wiro.ai:meta/Llama-3.3-70B-Instruct',
      'api.atlascloud.ai:meta-llama/Llama-3.3-70B-Instruct',
    ]);
    assert.equal(data.agentMode.provider, 'atlas');
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, index) => {
      if (previous[index] === undefined) delete process.env[name];
      else process.env[name] = previous[index];
    });
  }
});

test('reel brainstorms return reviewable ideas and discard proposed generation steps', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = 'test';
  const ideas = ['Gate announcement', 'Out of office', 'Travel claim', 'Suitcase surprise'].map(title => ({
    title, opening: 'Start with a visible action.', payoff: 'Reveal the cause.', shareReason: 'Send it to your travel partner.',
  }));
  let requestBody = '';
  let creativeCalls = 0;
  globalThis.fetch = async (_url, init) => {
    creativeCalls++;
    requestBody = String(init?.body || '');
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{
    text: JSON.stringify({
      text: JSON.stringify({ ideas, pick: 1, reason: 'The opening works without sound.' }),
      suggestedSteps: [{ type: 'generate_image', params: { prompt: 'A blue cup' } }],
    }),
  }] } }] });
  };
  try {
    const { default: router } = await import('./routes');
    const handler = (router as any).stack.find((layer: any) => layer.route?.path === '/agent/chat').route.stack[0].handle;
    let data: any;
    await handler({
      body: { messages: [{ role: 'user', content: 'Trips and toothaches' }], brainstormReels: true, creatorProfile: { audience: 'Busy parents', goal: 'Saves', limits: 'Film alone on a phone' }, ideaFeedback: [{ idea: { title: 'Prior gate joke', opening: 'A closed airport gate', payoff: 'A toothache', shareReason: 'Travel partners' }, status: 'passed', reason: 'Too generic', updatedAt: 1 }], interactionMode: 'build', textPlanningModel: 'frontier-gemini-flash' },
      user: { id: 'test-owner' },
    }, { status() { return this; }, json(value: any) { data = value; return this; } });
    assert.match(requestBody, /Busy parents/);
    assert.match(requestBody, /Film alone on a phone/);
    assert.equal(creativeCalls, 2);
    assert.equal(data.creativeReview.status, 'reviewed');
    assert.equal(data.creativeReview.provider, 'google');
    assert.match(requestBody, /CREATIVE CRITIQUE AND REWRITE/);
    assert.match(requestBody, /PROJECT IDEA FEEDBACK/);
    assert.match(requestBody, /Prior gate joke/);
    assert.match(requestBody, /Too generic/);
    assert.equal(data.interactionMode, 'plan');
    assert.deepEqual(data.reelIdeas.ideas, ideas);
    assert.equal(data.reelIdeas.pick, 1);
    assert.deepEqual(data.suggestedSteps, []);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});

test('a selected reel can draft visual steps even when the hook contains the word wait', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = 'test';
  globalThis.fetch = async () => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{
    text: JSON.stringify({ text: 'A 40-second reel outline.', suggestedSteps: [{ type: 'generate_image', params: { prompt: 'An airport gate, with no people' } }] }),
  }] } }] });
  try {
    const { buildReelIdeaBrief } = await import('../shared/agentReelIdeas');
    const { default: router } = await import('./routes');
    const handler = (router as any).stack.find((layer: any) => layer.route?.path === '/agent/chat').route.stack[0].handle;
    let data: any;
    const content = buildReelIdeaBrief({
      title: 'Wait for Boarding', opening: 'The gate agent calls for boarding.', payoff: 'The tooth interrupts.', shareReason: 'Travel partners recognize the moment.',
    });
    await handler({
      body: { messages: [{ role: 'user', content }], buildReelIdea: true, interactionMode: 'build', textPlanningModel: 'frontier-gemini-flash' },
      user: { id: 'test-owner' },
    }, { status() { return this; }, json(value: any) { data = value; return this; } });
    assert.equal(data.status, 'clarifying');
    assert.equal(data.suggestedSteps.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});

test('general task mode uses the selected model for tools and never proposes studio execution', async () => {
  const priorKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test';
  const originalFetch = globalThis.fetch;
  const requests: { url: string; body: any }[] = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(String(init?.body || '{}')) });
    const text = requests.length === 1
      ? JSON.stringify({ text: 'Calculate the requested discount.', suggestedSteps: [], campaign: null })
      : requests.length === 2
        ? JSON.stringify({ plan: ['Calculate the discounted amount'], toolCalls: [{ tool: 'calculate', args: { expression: '250*(1-20/100)' } }] })
        : JSON.stringify({ text: 'The discounted amount is 200.', status: 'complete' });
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } });
  };
  try {
    const { default: router } = await import('./routes');
    const handler = (router as any).stack.find((layer: any) => layer.route?.path === '/agent/chat').route.stack[0].handle;
    let data: any;
    await handler({ body: { messages: [{ role: 'user', content: 'Calculate 20% off 250' }], generalTask: true, interactionMode: 'build', textPlanningModel: 'frontier-gemini-flash' }, user: { id: 'test-owner' } }, { status() { return this; }, json(value: any) { data = value; return this; } });
    assert.equal(requests.length, 3);
    assert.equal(new Set(requests.map(request => request.url)).size, 1);
    assert.equal(data.interactionMode, 'plan');
    assert.equal(data.generalTask.status, 'complete');
    assert.equal(data.generalTask.modelCalls, 2);
    assert.match(data.generalTask.trace[0].summary, /200/);
    assert.match(data.text, /200/);
    assert.deepEqual(data.suggestedSteps, []);
    assert.match(JSON.stringify(requests[1].body), /general-purpose task assistant/);
    assert.doesNotMatch(JSON.stringify(requests[1].body), /AVAILABLE STEPS/);
  } finally {
    globalThis.fetch = originalFetch;
    if (priorKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = priorKey;
  }
});
