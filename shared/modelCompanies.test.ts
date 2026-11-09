import {test} from 'node:test';
import assert from 'node:assert/strict';
import {modelCompany,groupCompanyModels} from './modelCompanies';
test('groups by the creator rather than the hosting service across media',()=>{
 assert.equal(modelCompany({id:'wavespeed:openai/gpt-image-2.6',name:'GPT Image 2.6',provider:'WaveSpeed'}),'OpenAI');
 assert.equal(modelCompany({id:'wiro:google/nano-banana-2-1',name:'Nano Banana 2.1',provider:'Wiro'}),'Google / Gemini');
 assert.equal(modelCompany({id:'wavespeed:bytedance/seedance-v2',name:'Seedance 2'}),'ByteDance');
 assert.equal(modelCompany({id:'grok-imagine',name:'Grok Imagine'}),'xAI');
 assert.equal(modelCompany({id:'wavespeed:kling-video/kling-video-o3-4k',name:'Kling Video O3 4k'}),'Kuaishou');
 assert.equal(modelCompany({id:'eleven_v3',name:'Eleven v3'}),'ElevenLabs');
 assert.equal(modelCompany({id:'heygen',name:'HeyGen Avatar V'}),'HeyGen');
 assert.equal(modelCompany({id:'flux-model',name:'Flux',provider:'OpenAI compatible hosting'}),'Black Forest Labs');
});
test('newest versions appear first and unknown creators remain honest',()=>{
 const models=[{id:'g25',name:'GPT Image 2.5'},{id:'g26',name:'GPT Image 2.6'},{id:'unknown',name:'Custom portrait',provider:'Runware'},{id:'disabled',name:'Unavailable',disabled:true}];
 const groups=groupCompanyModels(models);
 assert.deepEqual(groups.find(g=>g.company==='OpenAI')?.models.map(m=>m.id),['g26','g25']);
 assert.equal(modelCompany(models[2]),'Other creators');
 assert.equal(modelCompany({id:'custom',name:'Portrait model',provider:'Acme Research'}),'Acme Research');
 assert.equal(groups.flatMap(g=>g.models).find(m=>m.id==='disabled')?.disabled,true);
 assert.equal(models[0].id,'g25');
});
