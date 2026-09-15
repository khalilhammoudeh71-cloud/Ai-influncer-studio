import test from 'node:test';import assert from 'node:assert/strict';
import { ModelVoiceClones } from './modelVoiceClones';
function fixture(){const rows=new Map<string,any>();let submitted=0;const service=new ModelVoiceClones({get:async(o,k)=>rows.get(o+':'+k),claim:async(o,k,v)=>{if(rows.has(o+':'+k))return false;rows.set(o+':'+k,v);return true;},put:async(o,k,v)=>{rows.set(o+':'+k,v);}},{WAVESPEED_API_KEY:'fixture'},async(url,init)=>{if(String(url).includes('/voice-clone')||String(url).includes('/vocal-clone')){submitted++;return Response.json({code:200,data:{id:'prediction-1',status:'created'}});}return Response.json({code:200,data:{id:'prediction-1',status:'completed',outputs:[{vocal_id:'vocal-fixture'}]}});});return{service,rows,submissions:()=>submitted};}
test('repeated model clone submissions share one operation and another owner cannot read it',async()=>{
 const f=fixture();const input={engine:'mureka-vocal',name:'Singing voice',reference:'https://example.com/voice.wav',speakerAuthorized:true};
 const first=await f.service.create('alice',input),second=await f.service.create('alice',input);
 assert.equal(first.id,second.id);assert.equal(f.submissions(),1);
 const done=await f.service.status('alice',first.id);assert.equal(done.voiceId,'vocal-fixture');assert.equal(done.assetKind,'singing');
 await assert.rejects(()=>f.service.status('bob',first.id),/not available/);
});
test('speaker permission is checked before a clone is claimed or sent',async()=>{
 const f=fixture();await assert.rejects(()=>f.service.create('alice',{engine:'minimax-clone',reference:'https://example.com/a.wav'}),/permission/i);
 assert.equal(f.rows.size,0);assert.equal(f.submissions(),0);
});
