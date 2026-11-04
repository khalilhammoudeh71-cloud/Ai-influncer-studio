import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverDirectModels, selectStableFlash, flashThinkingConfig } from './directModelCatalog';

test('selects latest stable general Flash numerically, excluding speech, image, lite and previews', () => {
 const models=['gemini-2.5-flash','gemini-3.8-flash','gemini-3.10-flash','gemini-4.0-flash-preview','gemini-5.0-flash-image','gemini-6.0-flash-lite','gemini-7.0-flash-tts'].map(id=>({id,methods:['generateContent']}));
 assert.equal(selectStableFlash(models),'gemini-3.10-flash');
 assert.equal(selectStableFlash([{id:'gemini-9.0-flash',methods:['embedContent']}]),'gemini-3.8-flash');
});
test('current Flash uses supported thinking levels, without old token budgets',()=>{
 assert.deepEqual(flashThinkingConfig(),{thinkingLevel:'low'});
});
test('daily scan paginates Google and records isolated provider failures without leaking credentials',async()=>{
 const calls:string[]=[];
 const result=await discoverDirectModels({GEMINI_API_KEY:'private-key',OPENAI_API_KEY:'private-openai'},async(input:any,init:any)=>{
  const url=String(input); calls.push(url); assert.ok(!url.includes('private-'));
  if(url.includes('openai.com'))return new Response('private-openai',{status:401});
  assert.equal(init.headers['x-goog-api-key'],'private-key');
  return Response.json(url.includes('pageToken=next')?{models:[{name:'models/gemini-3.8-flash',supportedGenerationMethods:['generateContent']}]}:{models:[{name:'models/gemini-2.5-flash',supportedGenerationMethods:['generateContent']}],nextPageToken:'next'});
 });
 assert.equal(calls.length,3); assert.equal(result.providers.Google.models.length,2);
 assert.equal(result.selectedFlash,'gemini-3.8-flash'); assert.equal(result.providers.OpenAI.ok,false);
 assert.ok(!JSON.stringify(result).includes('private-')); assert.equal(result.providers.ElevenLabs.configured,false);
});
test('a malformed catalog cannot replace the last known inventory with an empty success',async()=>{
 const result=await discoverDirectModels({GEMINI_API_KEY:'key'},async()=>Response.json({error:'bad schema'}));
 assert.equal(result.providers.Google.ok,false);
});

test('failed daily scans retain the last successful inventory and model selection across cold starts',async()=>{
 const { mergeDirectModelSnapshot, applyDirectModelSnapshot, getStudioFlashModel }=await import('./directModelCatalog');
 const previous={checkedAt:'2026-11-02T00:00:00Z',selectedFlash:'gemini-3.10-flash',providers:{Google:{configured:true,ok:true,models:[{id:'gemini-3.10-flash',methods:['generateContent']}]}}};
 const current={checkedAt:'2026-11-03T00:00:00Z',selectedFlash:'gemini-3.8-flash',providers:{Google:{configured:true,ok:false,models:[],error:'Catalog returned HTTP 503'}}};
 const merged=mergeDirectModelSnapshot(current,previous);
 assert.equal(merged.selectedFlash,'gemini-3.10-flash');assert.equal(merged.providers.Google.ok,false);assert.equal(merged.providers.Google.models.length,1);
 applyDirectModelSnapshot(merged);assert.equal(getStudioFlashModel(),'gemini-3.10-flash');
 applyDirectModelSnapshot({...previous,selectedFlash:'gemini-3.8-flash',providers:{Google:{configured:true,ok:true,models:[{id:'gemini-3.8-flash',methods:['generateContent']}]}}});
});

test('speech defaults are separate from text/vision and current WAV responses are not wrapped twice',async()=>{
 const { getStudioTtsModel }=await import('./directModelCatalog');
 const { normalizeGeminiAudio }=await import('./geminiStockSpeech');
 assert.equal(getStudioTtsModel(),'gemini-3.8-flash-tts');
 const wav=Buffer.from('RIFF1234WAVEabcd');
 assert.equal(normalizeGeminiAudio(wav.toString('base64'),'audio/wav'),`data:audio/wav;base64,${wav.toString('base64')}`);
});

test('a new default must pass a multimodal compatibility check before activation',async()=>{
 const {validateFlashCandidate}=await import('./directModelCatalog');let payload:any;
 assert.equal(await validateFlashCandidate('gemini-3.10-flash','key',async(_url,init)=>{payload=JSON.parse(init!.body as string);return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'{"ok":true}'}]}}]});}),true);
 assert.ok(payload.contents[0].parts.some((p:any)=>p.inlineData?.mimeType==='image/png'));
 assert.equal(await validateFlashCandidate('gemini-3.10-flash','key',async()=>Response.json({error:'unsupported'},{status:400})),false);
 assert.equal(await validateFlashCandidate('gemini-3.10-flash','key',async()=>Response.json({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{"ok":true}'}]}}]})),false);
});
