import test from 'node:test';
import assert from 'node:assert/strict';
import {frontierModel,runFrontierChat} from './frontierModels';
test('only explicit verified model IDs select frontier routing',()=>{assert.equal(frontierModel('frontier-grok')?.model,'grok-4.6');assert.equal(frontierModel('gemini-3.5-pro'),undefined);});
test('selected model failure is explicit and never silently falls back',async()=>{let calls=0;await assert.rejects(runFrontierChat('frontier-grok','test',[],'system',async()=>{calls++;return new Response('{}',{status:429});}),/429/);assert.equal(calls,1);});
test('Gemini response records requested model and ignores thought parts',async()=>{const result=await runFrontierChat('frontier-gemini-pro','test',[],'system',async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{thought:true,text:'hidden'},{text:'answer'}]}}]})));assert.equal(result.text,'answer');assert.equal(result.model,'gemini-3.1-pro-preview');});
