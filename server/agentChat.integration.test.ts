import assert from 'node:assert/strict';
import test from 'node:test';

// Exercise the deployed route handler, with only external provider HTTP replaced.
// No database credentials or network access are needed by these cases.
test('planner failures do not invent image actions from keywords', async () => {
  const keys=['Gemini_api_key','gemini_api_key','GEMINI_API_KEY','AI_INTEGRATIONS_GEMINI_API_KEY'];
  const saved=keys.map(key=>process.env[key]);
  keys.forEach(key=>delete process.env[key]);
  const {default:router}=await import('./routes');
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
  }finally{globalThis.fetch=originalFetch;if(priorKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=priorKey;}
});

test('accepting a native plan does not require a second model call to summarize it', async () => {
  const names=['GEMINI_API_KEY','RUNWARE_API_KEY','WIRO_API_KEY','ATLASCLOUD_API_KEY','WAVESPEED_API_KEY','VENICE_API_KEY'];
  const values=names.map(name=>process.env[name]);names.forEach(name=>delete process.env[name]);
  process.env.GEMINI_API_KEY='test';process.env.RUNWARE_API_KEY='test';
  const originalFetch=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url)=>{
    if(String(url).endsWith('/models'))return new Response(JSON.stringify({data:[{id:'deepseek:v4@flash',capabilities:{function_tools:true}}]}));
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
  }finally{globalThis.fetch=originalFetch;names.forEach((name,index)=>{if(values[index]===undefined)delete process.env[name];else process.env[name]=values[index];});}
});

test('a partial native plan is rejected and replaced as a whole before review', async () => {
  const names=['RUNWARE_API_KEY'];const values=names.map(name=>process.env[name]);process.env.RUNWARE_API_KEY='test';
  const originalFetch=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url,init)=>{
    if(String(url).endsWith('/models'))return new Response(JSON.stringify({data:[{id:'deepseek:v4@flash',capabilities:{function_tools:true}}]}));
    calls++;
    const params=calls===1?{sourceImageFromStepIndex:0}:{prompt:'Change only the cup to green',sourceImageFromStepIndex:0};
    if(calls===2){const body=JSON.parse(init!.body as string);assert.equal(JSON.parse(body.messages.at(-1).content).ok,false);}
    return new Response(JSON.stringify({choices:[{message:{role:'assistant',tool_calls:[{id:'plan-'+calls,type:'function',function:{name:'create_studio_plan',arguments:JSON.stringify({summary:'Review the blue cup and green edit.',steps:[{type:'generate_image',params:{prompt:'A blue cup'}},{type:'edit_image',params}]})}}]}}]}));
  };
  try {
    const {default:router}=await import('./routes');const handler=(router as any).stack.find((layer:any)=>layer.route?.path==='/agent/chat').route.stack[0].handle;
    let data:any;await handler({body:{messages:[{role:'user',content:'Create a blue cup image then edit it green'}],voiceLlmModel:'adaptive-fast'},user:{id:'test-owner'}},{status(){return this;},json(value:any){data=value;return this;}});
    assert.equal(data.suggestedSteps.length,2);assert.equal(calls,2);assert.equal(data.suggestedSteps[1].params.prompt,'Change only the cup to green');
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
  const names=['GEMINI_API_KEY','RUNWARE_API_KEY'];const values=names.map(name=>process.env[name]);
  process.env.GEMINI_API_KEY='test';process.env.RUNWARE_API_KEY='test';
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
