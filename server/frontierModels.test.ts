import test from 'node:test';
import assert from 'node:assert/strict';
import {frontierModel,runFrontierChat} from './frontierModels';
test('only explicit verified model IDs select frontier routing',()=>{assert.equal(frontierModel('frontier-grok')?.model,'grok-4.6');assert.equal(frontierModel('gemini-3.5-pro'),undefined);});
test('selected model failure is explicit and never silently falls back',async()=>{let calls=0;await assert.rejects(runFrontierChat('frontier-grok','test',[],'system',async()=>{calls++;return new Response('{}',{status:429});}),/429/);assert.equal(calls,1);});
test('Gemini response records requested model and ignores thought parts',async()=>{const result=await runFrontierChat('frontier-gemini-pro','test',[],'system',async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{thought:true,text:'hidden'},{text:'answer'}]}}]})));assert.equal(result.text,'answer');assert.equal(result.model,'gemini-3.1-pro-preview');});

test('structured planning reaches both providers as a schema, retaining conversation roles', async () => {
  const schema = {type:'object',required:['text'],properties:{text:{type:'string'}}};
  for (const choice of ['frontier-grok','frontier-gemini-flash']) {
    let body:any;
    await runFrontierChat(choice,'test',[{role:'user',content:'A blue cup'},{role:'model',content:'Which table?'},{role:'user',content:'Wooden'}],'system',async(_url,init)=>{
      body=JSON.parse(init!.body as string);
      return new Response(JSON.stringify(choice==='frontier-grok'?{choices:[{message:{content:'{"text":"Ready"}'}}]}:{candidates:[{content:{parts:[{text:'{"text":"Ready"}'}]}}]}));
    },{maxOutputTokens:4096,responseSchema:schema} as any);
    assert.deepEqual(choice==='frontier-grok'?body.response_format?.json_schema?.schema:body.generationConfig?.responseJsonSchema,schema);
    assert.deepEqual(choice==='frontier-grok'?body.messages.slice(1).map((m:any)=>m.role):body.contents.map((m:any)=>m.role),choice==='frontier-grok'?['user','assistant','user']:['user','model','user']);
  }
});

test('the saved Grok choice uses the same bounded text adapter as the explicit choice', async () => {
  let body:any;
  const result=await runFrontierChat('grok','test',[{role:'user',content:'Prepare my plan'}],'system',async(_url,init)=>{
    body=JSON.parse(init!.body as string);
    return new Response(JSON.stringify({choices:[{message:{content:'Ready'}}]}));
  });
  assert.equal(body.model,process.env.XAI_SUPER_AGENT_MODEL || 'grok-4.6');
  assert.equal(result.text,'Ready');
});

test('truncated provider output cannot be accepted as a complete response',async()=>{
  await assert.rejects(runFrontierChat('frontier-grok','test',[],'system',async()=>new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{"text":"Ready",'}}]}))),/incomplete|truncat/i);
});
